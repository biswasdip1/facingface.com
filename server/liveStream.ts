import type { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { endLiveStream, getLiveStream, updateViewerCount } from "./db";
import { initCallSignaling } from "./callSignaling";

/** Maximum stream duration in milliseconds — must match STREAM_DURATION_MS on the client */
export const MAX_STREAM_DURATION_MS = 3 * 60 * 1000; // 3 minutes
const WARNING_BEFORE_END_MS = 30 * 1000; // warn 30 s before auto-end

// Map: streamId -> server-side auto-end timer
const streamTimers = new Map<number, ReturnType<typeof setTimeout>>();

// Map: streamId -> hostSocketId
const streamHosts = new Map<number, string>();
// Map: streamId -> Set of viewer socket ids
const streamViewers = new Map<number, Set<string>>();

export function initLiveStreamSocket(httpServer: HttpServer) {
  const io = new SocketServer(httpServer, {
    path: "/api/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // Attach call signaling handlers to the same socket server
  initCallSignaling(io);

  io.on("connection", (socket) => {
    let currentStreamId: number | null = null;
    let isHost = false;

    // ── Host starts broadcasting ──────────────────────────────────────────────
    socket.on("live:host", async ({ streamId }: { streamId: number }) => {
      const stream = await getLiveStream(streamId);
      if (!stream || stream.status !== "active") {
        socket.emit("live:error", { message: "Stream not found or already ended." });
        return;
      }
      currentStreamId = streamId;
      isHost = true;
      streamHosts.set(streamId, socket.id);
      if (!streamViewers.has(streamId)) streamViewers.set(streamId, new Set());
      socket.join(`stream:${streamId}`);
      socket.emit("live:host:ready", { streamId });

      // ── Server-side auto-end timer ─────────────────────────────────────────
      // Clear any stale timer for this stream (safety)
      const existing = streamTimers.get(streamId);
      if (existing) clearTimeout(existing);

      // Warn host 30 s before the limit
      const warnTimer = setTimeout(() => {
        socket.emit("live:time-warning", { secondsLeft: WARNING_BEFORE_END_MS / 1000 });
      }, MAX_STREAM_DURATION_MS - WARNING_BEFORE_END_MS);

      // Force-end when the limit is reached
      const endTimer = setTimeout(async () => {
        clearTimeout(warnTimer);
        streamTimers.delete(streamId);
        const s = await getLiveStream(streamId);
        if (s && s.status === "active") {
          await endLiveStream(streamId, s.hostId);
          io.to(`stream:${streamId}`).emit("live:ended", { streamId, reason: "time_limit" });
        }
        streamHosts.delete(streamId);
        streamViewers.delete(streamId);
      }, MAX_STREAM_DURATION_MS);

      streamTimers.set(streamId, endTimer);
    });

    // ── Viewer joins stream ───────────────────────────────────────────────────
    socket.on("live:join", async ({ streamId }: { streamId: number }) => {
      const stream = await getLiveStream(streamId);
      if (!stream || stream.status !== "active") {
        socket.emit("live:error", { message: "Stream is not active." });
        return;
      }
      currentStreamId = streamId;
      isHost = false;
      const viewers = streamViewers.get(streamId) ?? new Set<string>();
      viewers.add(socket.id);
      streamViewers.set(streamId, viewers);
      socket.join(`stream:${streamId}`);
      await updateViewerCount(streamId, 1);

      // Notify host a new viewer joined (so host sends offer)
      const hostSocketId = streamHosts.get(streamId);
      if (hostSocketId) {
        io.to(hostSocketId).emit("live:viewer:joined", { viewerSocketId: socket.id, viewerCount: viewers.size });
      }
      socket.emit("live:joined", { streamId, viewerCount: viewers.size });
    });

    // ── WebRTC Signalling: host → viewer ──────────────────────────────────────
    socket.on("live:offer", ({ targetSocketId, offer }: { targetSocketId: string; offer: RTCSessionDescriptionInit }) => {
      io.to(targetSocketId).emit("live:offer", { offer, hostSocketId: socket.id });
    });

    socket.on("live:answer", ({ targetSocketId, answer }: { targetSocketId: string; answer: RTCSessionDescriptionInit }) => {
      io.to(targetSocketId).emit("live:answer", { answer });
    });

    socket.on("live:ice", ({ targetSocketId, candidate }: { targetSocketId: string; candidate: RTCIceCandidateInit }) => {
      io.to(targetSocketId).emit("live:ice", { candidate });
    });

     // ── Host ends stream ────────────────────────────────────────────────────
    socket.on("live:end", async ({ streamId, hostId }: { streamId: number; hostId: number }) => {
      // Cancel the server-side auto-end timer
      const t = streamTimers.get(streamId);
      if (t) { clearTimeout(t); streamTimers.delete(streamId); }
      await endLiveStream(streamId, hostId);
      io.to(`stream:${streamId}`).emit("live:ended", { streamId });
      streamHosts.delete(streamId);
      streamViewers.delete(streamId);
    });;

    // ── Cleanup on disconnect ─────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      if (currentStreamId === null) return;

      if (isHost) {
        // Cancel server-side auto-end timer
        const t = streamTimers.get(currentStreamId);
        if (t) { clearTimeout(t); streamTimers.delete(currentStreamId); }
        // Host disconnected — end the stream
        const stream = await getLiveStream(currentStreamId);
        if (stream && stream.status === "active") {
          await endLiveStream(currentStreamId, stream.hostId);
          io.to(`stream:${currentStreamId}`).emit("live:ended", { streamId: currentStreamId });
        }
        streamHosts.delete(currentStreamId);
        streamViewers.delete(currentStreamId);
      } else {
        // Viewer disconnected
        const viewers = streamViewers.get(currentStreamId);
        if (viewers) {
          viewers.delete(socket.id);
          await updateViewerCount(currentStreamId, -1);
          const hostSocketId = streamHosts.get(currentStreamId);
          if (hostSocketId) {
            io.to(hostSocketId).emit("live:viewer:left", { viewerSocketId: socket.id, viewerCount: viewers.size });
          }
        }
      }
    });
  });

  return io;
}
