import type { Server as HttpServer } from "http";
import { Server as SocketServer, type Socket } from "socket.io";
import {
  endLiveStream,
  getLiveStream,
  isUserSuspended,
  updateViewerCount,
} from "./db";
import { initCallSignaling } from "./callSignaling";
import {
  LIVE_STREAM_DURATION_MS,
  LIVE_STREAM_WARNING_MS,
  liveStreamDeadline,
} from "../shared/liveStream";

/** Compatibility export; the shared policy is the single duration source. */
export const MAX_STREAM_DURATION_MS = LIVE_STREAM_DURATION_MS;

type StreamIdentity = {
  id: number;
  hostId: number;
  startedAt: Date | string;
};
type Membership = { streamId: number; role: "host" | "viewer" };
type Session = {
  streamId: number;
  hostId: number;
  expiresAt: number;
  hostSocketId?: string;
  viewers: Set<string>;
  endTimer?: ReturnType<typeof setTimeout>;
  warningTimer?: ReturnType<typeof setTimeout>;
  warned: boolean;
  closed: boolean;
  countUpdates: Promise<void>;
};

let socketServer: SocketServer | undefined;
const attachedServers = new WeakSet<SocketServer>();
const sessions = new Map<number, Session>();
const memberships = new Map<string, Membership>();
// A failed database write must not allow the same broadcast to reopen. Old
// entries are retained until their original deadline also denies entry.
const endedStreams = new Map<number, number>();

function logFailure(operation: string, error: unknown) {
  console.warn(
    `[LiveStream] ${operation} failed: ${error instanceof Error ? error.message : "unknown error"}`
  );
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function streamIdFrom(value: unknown): number | undefined {
  return record(value) && validId(value.streamId) ? value.streamId : undefined;
}

function roomFor(streamId: number) {
  return `stream:${streamId}`;
}

function clearTimers(session: Session) {
  if (session.endTimer) clearTimeout(session.endTimer);
  if (session.warningTimer) clearTimeout(session.warningTimer);
  session.endTimer = undefined;
  session.warningTimer = undefined;
}

function countPayload(session: Session) {
  return {
    streamId: session.streamId,
    viewerCount: session.viewers.size,
    expiresAt: session.expiresAt,
    serverNow: Date.now(),
  };
}

function broadcastCount(session: Session) {
  socketServer
    ?.to(roomFor(session.streamId))
    .emit("live:viewers", countPayload(session));
}

function queueViewerDelta(session: Session, delta: number) {
  if (!delta) return;
  // Preserve join/leave ordering even when database requests finish out of order.
  session.countUpdates = session.countUpdates
    .then(() => updateViewerCount(session.streamId, delta))
    .catch(error => logFailure("viewer count", error));
}

function cleanupSession(session: Session, reason?: string) {
  session.closed = true;
  clearTimers(session);
  const io = socketServer;
  const room = roomFor(session.streamId);
  if (reason)
    io?.to(room).emit("live:ended", { streamId: session.streamId, reason });
  for (const [socketId, membership] of Array.from(memberships.entries())) {
    if (membership.streamId === session.streamId) memberships.delete(socketId);
  }
  queueViewerDelta(session, -session.viewers.size);
  session.viewers.clear();
  session.hostSocketId = undefined;
  sessions.delete(session.streamId);
  // Leave only livestream rooms, never Messenger/call rooms or the socket itself.
  try {
    const leaving = io?.in(room).socketsLeave(room);
    Promise.resolve(leaving).catch(error => logFailure("room cleanup", error));
  } catch (error) {
    logFailure("room cleanup", error);
  }
}

async function finishSession(session: Session, reason: string): Promise<void> {
  if (session.closed || endedStreams.has(session.streamId)) return;
  for (const [streamId, deadline] of Array.from(endedStreams.entries())) {
    if (deadline <= Date.now()) endedStreams.delete(streamId);
  }
  endedStreams.set(session.streamId, session.expiresAt);
  // Close peers and timers immediately, including when persistence is unavailable.
  cleanupSession(session, reason);
  try {
    await endLiveStream(session.streamId, session.hostId);
  } catch (error) {
    logFailure("ending stream", error);
  }
  await session.countUpdates;
}

function warningPayload(session: Session) {
  return {
    streamId: session.streamId,
    secondsLeft: Math.max(
      0,
      Math.ceil((session.expiresAt - Date.now()) / 1000)
    ),
    expiresAt: session.expiresAt,
    serverNow: Date.now(),
  };
}

function scheduleDeadline(session: Session) {
  clearTimers(session);
  const remaining = Math.max(0, session.expiresAt - Date.now());
  if (!session.warned) {
    session.warningTimer = setTimeout(
      () => {
        session.warningTimer = undefined;
        if (session.closed) return;
        session.warned = true;
        socketServer
          ?.to(roomFor(session.streamId))
          .emit("live:time-warning", warningPayload(session));
      },
      Math.max(0, remaining - LIVE_STREAM_WARNING_MS)
    );
    session.warningTimer.unref?.();
  }
  session.endTimer = setTimeout(() => {
    session.endTimer = undefined;
    void finishSession(session, "time_limit").catch(error =>
      logFailure("deadline", error)
    );
  }, remaining);
  session.endTimer.unref?.();
}

function makeSession(stream: StreamIdentity): Session {
  return {
    streamId: stream.id,
    hostId: stream.hostId,
    expiresAt: liveStreamDeadline(stream.startedAt),
    viewers: new Set(),
    warned: false,
    closed: false,
    countUpdates: Promise.resolve(),
  };
}

/** Called immediately after API creation, including when camera setup never succeeds. */
export function registerLiveStreamDeadline(stream: StreamIdentity): void {
  if (
    !validId(stream.id) ||
    !validId(stream.hostId) ||
    endedStreams.has(stream.id)
  )
    return;
  const existing = sessions.get(stream.id);
  const deadline = liveStreamDeadline(stream.startedAt);
  if (existing) {
    // Re-registering a host never buys more time. Only an earlier DB start can
    // shorten an existing deadline (for example after recovering a stale row).
    if (deadline < existing.expiresAt) {
      existing.expiresAt = deadline;
      scheduleDeadline(existing);
    }
    return;
  }
  const session = makeSession(stream);
  sessions.set(stream.id, session);
  scheduleDeadline(session);
}

/**
 * API callers pass their authenticated user ID, not a request-supplied host ID.
 * False means missing/wrong owner; true includes an already-ended owned stream.
 * An authorized end closes realtime resources even if persistence fails (logged).
 */
export async function endLiveStreamSession(
  streamId: number,
  hostId: number,
  reason = "host_ended"
): Promise<boolean> {
  if (!validId(streamId) || !validId(hostId)) return false;
  const stream = await getLiveStream(streamId);
  if (!stream || stream.hostId !== hostId) return false;
  if (stream.status !== "active" || endedStreams.has(streamId)) {
    const session = sessions.get(streamId);
    if (session) {
      endedStreams.set(streamId, session.expiresAt);
      cleanupSession(
        session,
        session.expiresAt <= Date.now() ? "time_limit" : reason
      );
      await session.countUpdates;
    }
    return true;
  }
  await finishSession(sessions.get(streamId) ?? makeSession(stream), reason);
  return true;
}

function errorTo(socket: Socket, message: string) {
  if (socket.connected) socket.emit("live:error", { message });
}

async function leaveMembership(socket: Socket, reason = "host_left") {
  const membership = memberships.get(socket.id);
  if (!membership) return;
  memberships.delete(socket.id);
  await socket.leave(roomFor(membership.streamId));
  const session = sessions.get(membership.streamId);
  if (!session || session.closed) return;
  if (membership.role === "host" && session.hostSocketId === socket.id) {
    await finishSession(session, reason);
  } else if (session.viewers.delete(socket.id)) {
    queueViewerDelta(session, -1);
    if (session.hostSocketId) {
      socketServer?.to(session.hostSocketId).emit("live:viewer:left", {
        viewerSocketId: socket.id,
        ...countPayload(session),
      });
    }
    broadcastCount(session);
  }
}

function description(value: unknown, type: "offer" | "answer") {
  return (
    record(value) &&
    value.type === type &&
    typeof value.sdp === "string" &&
    value.sdp.length > 0 &&
    value.sdp.length <= 1_000_000
  );
}

function iceCandidate(value: unknown) {
  return (
    record(value) &&
    typeof value.candidate === "string" &&
    value.candidate.length <= 16_384 &&
    (value.sdpMid === undefined ||
      value.sdpMid === null ||
      (typeof value.sdpMid === "string" && value.sdpMid.length <= 256)) &&
    (value.sdpMLineIndex === undefined ||
      value.sdpMLineIndex === null ||
      (typeof value.sdpMLineIndex === "number" &&
        Number.isInteger(value.sdpMLineIndex) &&
        value.sdpMLineIndex >= 0)) &&
    (value.usernameFragment === undefined ||
      value.usernameFragment === null ||
      (typeof value.usernameFragment === "string" &&
        value.usernameFragment.length <= 256))
  );
}

/** Attach only livestream handlers; authentication remains in initCallSignaling. */
export function attachLiveStreamHandlers(io: SocketServer): void {
  if (attachedServers.has(io)) return;
  attachedServers.add(io);
  socketServer = io;

  io.on("connection", socket => {
    const userId = socket.data.userId;
    if (!validId(userId)) {
      socket.disconnect(true);
      return;
    }
    let revision = 0;
    const stillCurrent = (ticket: number) =>
      socket.connected && ticket === revision;

    function onAsync(
      event: string,
      handler: (payload: unknown) => Promise<void>
    ) {
      socket.on(event, payload => {
        void handler(payload).catch(error => {
          logFailure(event, error);
          errorTo(
            socket,
            "Unable to complete the livestream request. Please try again."
          );
        });
      });
    }

    async function enter(payload: unknown, role: Membership["role"]) {
      const ticket = ++revision;
      const streamId = streamIdFrom(payload);
      if (!streamId) {
        errorTo(socket, "Invalid stream ID.");
        return;
      }
      const stream = await getLiveStream(streamId);
      if (!stillCurrent(ticket)) return;
      if (!stream || stream.status !== "active" || endedStreams.has(streamId)) {
        const existing = sessions.get(streamId);
        if (stream?.status !== "active" && existing) {
          endedStreams.set(streamId, existing.expiresAt);
          cleanupSession(
            existing,
            existing.expiresAt <= Date.now() ? "time_limit" : "host_ended"
          );
        }
        errorTo(socket, "Stream not found or already ended.");
        return;
      }
      if (role === "host") {
        if (stream.hostId !== userId) {
          errorTo(socket, "Only the stream owner can broadcast.");
          return;
        }
        const suspension = await isUserSuspended(userId);
        if (!stillCurrent(ticket)) return;
        if (suspension.suspended) {
          errorTo(socket, "Suspended accounts cannot broadcast.");
          return;
        }
      } else if (stream.hostId === userId) {
        errorTo(socket, "The host must join as a broadcaster, not a viewer.");
        return;
      }
      if (!stillCurrent(ticket) || endedStreams.has(streamId)) return;
      registerLiveStreamDeadline(stream);
      const session = sessions.get(streamId);
      if (!session || session.closed) return;
      if (session.expiresAt <= Date.now()) {
        await finishSession(session, "time_limit");
        errorTo(socket, "Stream has reached its five-minute time limit.");
        return;
      }
      if (
        role === "host" &&
        session.hostSocketId &&
        session.hostSocketId !== socket.id
      ) {
        errorTo(
          socket,
          "This stream is already broadcasting on another connection."
        );
        return;
      }
      const previous = memberships.get(socket.id);
      if (
        previous &&
        (previous.streamId !== streamId || previous.role !== role)
      ) {
        await leaveMembership(socket);
        if (
          !stillCurrent(ticket) ||
          session.closed ||
          endedStreams.has(streamId)
        )
          return;
      }
      // Another host may have won while a previous membership was being closed.
      if (
        role === "host" &&
        session.hostSocketId &&
        session.hostSocketId !== socket.id
      ) {
        errorTo(
          socket,
          "This stream is already broadcasting on another connection."
        );
        return;
      }
      const duplicate = memberships.get(socket.id)?.streamId === streamId;
      const membership: Membership = { streamId, role };
      memberships.set(socket.id, membership);
      if (role === "host") session.hostSocketId = socket.id;
      else if (!session.viewers.has(socket.id)) {
        session.viewers.add(socket.id);
        queueViewerDelta(session, 1);
      }
      await socket.join(roomFor(streamId));
      if (
        !stillCurrent(ticket) ||
        memberships.get(socket.id) !== membership ||
        session.closed
      ) {
        // An async adapter may finish joining after disconnect/end/switch.
        if (memberships.get(socket.id)?.streamId !== streamId)
          await socket.leave(roomFor(streamId));
        return;
      }
      socket.emit(
        role === "host" ? "live:host:ready" : "live:joined",
        countPayload(session)
      );
      if (role === "host") {
        if (
          session.warned &&
          session.expiresAt - Date.now() <= LIVE_STREAM_WARNING_MS
        ) {
          socket.emit("live:time-warning", warningPayload(session));
        }
        if (!duplicate) {
          // Viewers that arrived before the camera/host are waiting, not lost.
          for (const viewerSocketId of Array.from(session.viewers)) {
            socket.emit("live:viewer:joined", {
              viewerSocketId,
              ...countPayload(session),
            });
          }
        }
      } else if (!duplicate && session.hostSocketId) {
        io.to(session.hostSocketId).emit("live:viewer:joined", {
          viewerSocketId: socket.id,
          ...countPayload(session),
        });
      }
      broadcastCount(session);
    }

    onAsync("live:host", payload => enter(payload, "host"));
    onAsync("live:join", payload => enter(payload, "viewer"));
    onAsync("live:leave", async payload => {
      const membership = memberships.get(socket.id);
      if (!membership) {
        ++revision;
        return;
      }
      if (
        payload !== undefined &&
        (!record(payload) ||
          (payload.streamId !== undefined &&
            payload.streamId !== membership.streamId))
      ) {
        errorTo(socket, "Invalid stream leave request.");
        return;
      }
      ++revision;
      await leaveMembership(socket);
    });

    function relay(
      event: "live:offer" | "live:answer" | "live:ice",
      payload: unknown
    ) {
      if (!record(payload)) {
        errorTo(socket, "Invalid livestream signaling payload.");
        return;
      }
      const membership = memberships.get(socket.id);
      const targetSocketId = payload.targetSocketId;
      const target =
        typeof targetSocketId === "string" && targetSocketId.length <= 200
          ? memberships.get(targetSocketId)
          : undefined;
      const session = membership
        ? sessions.get(membership.streamId)
        : undefined;
      const hostSending = membership?.role === "host";
      const currentStream =
        payload.streamId === undefined ||
        payload.streamId === membership?.streamId;
      const registeredPair =
        session &&
        membership &&
        target &&
        target.streamId === membership.streamId &&
        (hostSending
          ? session.hostSocketId === socket.id &&
            target.role === "viewer" &&
            session.viewers.has(targetSocketId as string)
          : session.viewers.has(socket.id) &&
            target.role === "host" &&
            session.hostSocketId === targetSocketId);
      const validBody =
        event === "live:offer"
          ? hostSending && description(payload.offer, "offer")
          : event === "live:answer"
            ? !hostSending && description(payload.answer, "answer")
            : iceCandidate(payload.candidate);
      if (
        !currentStream ||
        !registeredPair ||
        !validBody ||
        !session ||
        session.closed ||
        !io.sockets.sockets.get(targetSocketId as string)?.connected
      ) {
        errorTo(socket, "Invalid livestream peer or signaling payload.");
        return;
      }
      if (session.expiresAt <= Date.now()) {
        void finishSession(session, "time_limit").catch(error =>
          logFailure("signaling expiry", error)
        );
        errorTo(socket, "Stream has ended.");
        return;
      }
      const identity = {
        streamId: session.streamId,
        senderSocketId: socket.id,
      };
      if (event === "live:offer")
        io.to(targetSocketId as string).emit(event, {
          ...identity,
          hostSocketId: socket.id,
          offer: payload.offer,
        });
      else if (event === "live:answer")
        io.to(targetSocketId as string).emit(event, {
          ...identity,
          viewerSocketId: socket.id,
          answer: payload.answer,
        });
      else
        io.to(targetSocketId as string).emit(event, {
          ...identity,
          candidate: payload.candidate,
        });
    }

    socket.on("live:offer", payload => relay("live:offer", payload));
    socket.on("live:answer", payload => relay("live:answer", payload));
    socket.on("live:ice", payload => relay("live:ice", payload));

    onAsync("live:end", async payload => {
      const streamId = streamIdFrom(payload);
      const membership = memberships.get(socket.id);
      if (
        !streamId ||
        membership?.streamId !== streamId ||
        membership.role !== "host" ||
        sessions.get(streamId)?.hostSocketId !== socket.id
      ) {
        errorTo(
          socket,
          "Only the registered stream owner can end this broadcast."
        );
        return;
      }
      const ticket = ++revision;
      const stream = await getLiveStream(streamId);
      if (!stillCurrent(ticket) || memberships.get(socket.id) !== membership)
        return;
      if (!stream || stream.hostId !== userId) {
        errorTo(socket, "Only the stream owner can end this broadcast.");
        return;
      }
      const session = sessions.get(streamId);
      if (!session || session.hostSocketId !== socket.id) return;
      if (stream.status !== "active") {
        endedStreams.set(streamId, session.expiresAt);
        cleanupSession(
          session,
          session.expiresAt <= Date.now() ? "time_limit" : "host_ended"
        );
      } else await finishSession(session, "host_ended");
    });

    socket.on("disconnect", () => {
      ++revision;
      void leaveMembership(socket, "host_disconnected").catch(error =>
        logFailure("disconnect cleanup", error)
      );
    });
  });
}

export function initLiveStreamSocket(httpServer: HttpServer) {
  const io = new SocketServer(httpServer, {
    path: "/api/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"] },
  });
  // Preserve the existing authenticated Messenger/call server and middleware.
  initCallSignaling(io);
  attachLiveStreamHandlers(io);
  return io;
}
