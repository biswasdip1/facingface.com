import type { Server as SocketServer } from "socket.io";
import { sendCallPushNotification } from "./webpush";
import { sdk } from "./_core/sdk";

// A user can have the main website and a messaging page open at the same time.
// Keep every authenticated connection rather than replacing one socket with another.
const userSockets = new Map<number, Set<string>>();
let socketServer: SocketServer | null = null;

export type FriendPostFlashPayload = {
  postId: number;
  authorId: number;
  authorName: string;
  authorAvatar: string | null;
  audience: "public" | "private";
};

type FriendshipParticipant = { userId1: number; userId2: number };

/** Convert durable accepted friendship rows into unique friend alert recipients. */
export function getFriendPostAlertRecipients(authorId: number, friendships: FriendshipParticipant[]): number[] {
  const recipients = new Set<number>();
  for (const friendship of friendships) {
    if (friendship.userId1 === authorId && friendship.userId2 > 0) recipients.add(friendship.userId2);
    if (friendship.userId2 === authorId && friendship.userId1 > 0) recipients.add(friendship.userId1);
  }
  recipients.delete(authorId);
  return [...recipients];
}

/** Check if a user currently has one or more active authenticated connections. */
export function isUserOnline(userId: number): boolean {
  return (userSockets.get(userId)?.size ?? 0) > 0;
}

function addUserSocket(userId: number, socketId: string) {
  const sockets = userSockets.get(userId) ?? new Set<string>();
  sockets.add(socketId);
  userSockets.set(userId, sockets);
}

function removeUserSocket(userId: number, socketId: string) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  sockets.delete(socketId);
  if (sockets.size === 0) userSockets.delete(userId);
}

function emitToUser(userId: number, event: string, payload: object) {
  const sockets = userSockets.get(userId);
  if (!socketServer || !sockets) return;
  for (const socketId of sockets) socketServer.to(socketId).emit(event, payload);
}

/**
 * Sends an in-app-only flash event to accepted friends currently using
 * FacingFace. The event deliberately carries no post text, media URLs, or
 * link-preview data; the secure post-detail route remains the final access gate.
 */
export function emitFriendPostFlash(recipientIds: number[], payload: FriendPostFlashPayload) {
  const recipientSet = new Set(recipientIds.filter((id) => Number.isInteger(id) && id > 0 && id !== payload.authorId));
  for (const recipientId of recipientSet) emitToUser(recipientId, "post:friend-created", payload);
}

/**
 * Attach authenticated call, direct-message and presence handlers to an
 * existing Socket.IO server instance. The session cookie—not a client-supplied
 * query parameter—determines which user receives targeted events.
 */
export function initCallSignaling(io: SocketServer) {
  socketServer = io;

  io.use(async (socket, next) => {
    try {
      const user = await sdk.authenticateRequest(socket.request as any);
      socket.data.userId = user.id;
      next();
    } catch {
      next(new Error("Unauthorized socket connection"));
    }
  });

  io.on("connection", (socket) => {
    const userId = Number(socket.data.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      socket.disconnect(true);
      return;
    }
    addUserSocket(userId, socket.id);

    function forwardTo(toUserId: number, event: string, payload: object) {
      emitToUser(toUserId, event, payload);
    }

    socket.on("call:offer", (data: { to: number; from?: number; fromName: string; offer: RTCSessionDescriptionInit; isVideo: boolean }) => {
      forwardTo(data.to, "call:offer", { from: userId, fromName: data.fromName, offer: data.offer, isVideo: data.isVideo });
      // Send Web Push if the recipient is not currently connected via Socket.IO.
      if (!isUserOnline(data.to)) {
        sendCallPushNotification(data.to, data.fromName, data.isVideo ? "video" : "voice").catch(() => {});
      }
    });

    socket.on("call:answer", (data: { to: number; answer: RTCSessionDescriptionInit }) => {
      forwardTo(data.to, "call:answer", { answer: data.answer });
    });

    socket.on("call:ice", (data: { to: number; candidate: RTCIceCandidateInit }) => {
      forwardTo(data.to, "call:ice", { candidate: data.candidate });
    });

    socket.on("call:hangup", (data: { to: number }) => {
      forwardTo(data.to, "call:hangup", {});
    });

    // ── DM typing indicators ──────────────────────────────────────────────────
    socket.on("dm:typing", (data: { to: number; from?: number; conversationId: number }) => {
      forwardTo(data.to, "dm:typing", { from: userId, conversationId: data.conversationId });
    });

    socket.on("dm:stopTyping", (data: { to: number; from?: number; conversationId: number }) => {
      forwardTo(data.to, "dm:stopTyping", { from: userId, conversationId: data.conversationId });
    });

    // ── Presence broadcast ────────────────────────────────────────────────────
    io.emit("dm:online", { userId });

    socket.on("disconnect", () => {
      removeUserSocket(userId, socket.id);
      if (!isUserOnline(userId)) io.emit("dm:offline", { userId });
    });
  });
}
