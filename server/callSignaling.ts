import type { Server as SocketServer } from "socket.io";
import { sendCallPushNotification } from "./webpush";

// Map: userId (number) -> socket id
const userSockets = new Map<number, string>();

/** Check if a user currently has an active socket connection */
export function isUserOnline(userId: number): boolean {
  return userSockets.has(userId);
}

/**
 * Attach call-signaling event handlers to an existing Socket.IO server instance.
 * Events used:
 *   call:offer   { to, from, fromName, offer, isVideo }  → forwarded to recipient
 *   call:answer  { to, answer }                          → forwarded to caller
 *   call:ice     { to, candidate }                       → forwarded to peer
 *   call:hangup  { to }                                  → forwarded to peer
 */
export function initCallSignaling(io: SocketServer) {
  io.on("connection", (socket) => {
    // Each socket registers its userId on connect via query param
    const rawUserId = socket.handshake.query.userId;
    const userId = rawUserId ? Number(rawUserId) : null;
    if (userId && !isNaN(userId)) {
      userSockets.set(userId, socket.id);
    }

    function forwardTo(toUserId: number, event: string, payload: object) {
      const targetSocketId = userSockets.get(toUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit(event, payload);
      }
    }

    socket.on("call:offer", (data: { to: number; from: number; fromName: string; offer: RTCSessionDescriptionInit; isVideo: boolean }) => {
      forwardTo(data.to, "call:offer", { from: data.from, fromName: data.fromName, offer: data.offer, isVideo: data.isVideo });
      // Send Web Push if the recipient is not currently connected via Socket.IO
      const recipientOnline = userSockets.has(data.to);
      if (!recipientOnline) {
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
    socket.on("dm:typing", (data: { to: number; from: number; conversationId: number }) => {
      forwardTo(data.to, "dm:typing", { from: data.from, conversationId: data.conversationId });
    });

    socket.on("dm:stopTyping", (data: { to: number; from: number; conversationId: number }) => {
      forwardTo(data.to, "dm:stopTyping", { from: data.from, conversationId: data.conversationId });
    });

    // ── Presence broadcast ────────────────────────────────────────────────────
    // Broadcast online status to all connected sockets when a user connects
    if (userId && !isNaN(userId)) {
      io.emit("dm:online", { userId });
    }

    socket.on("disconnect", () => {
      if (userId) {
        userSockets.delete(userId);
        io.emit("dm:offline", { userId });
      }
    });
  });
}
