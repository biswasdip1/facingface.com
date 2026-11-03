import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Radio, Users, Clock, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  LIVE_STREAM_DURATION_MS,
  formatLiveStreamTime,
  liveStreamTimeLeft,
} from "@shared/liveStream";
import {
  LIVE_FALLBACK_ICE,
  applyLiveIce,
  liveCameraError,
} from "@/lib/liveStreamMedia";

type LiveBroadcastProps = {
  streamId: number;
  hostId: number;
  onEnded: () => void;
};
type LivePeer = { pc: RTCPeerConnection; ice: RTCIceCandidateInit[] };

export default function LiveBroadcast({
  streamId,
  onEnded,
}: LiveBroadcastProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;
  const utils = trpc.useUtils();
  const apiRef = useRef(utils.client);
  apiRef.current = utils.client;
  const stopRef = useRef<() => void>(() => {});
  const [viewerCount, setViewerCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(LIVE_STREAM_DURATION_MS);
  const [isLive, setIsLive] = useState(false);
  const [phase, setPhase] = useState("Allow camera and microphone to start");

  useEffect(() => {
    let disposed = false;
    let finished = false;
    let media: MediaStream | null = null;
    let socket: ReturnType<typeof io> | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let connectionTimer: ReturnType<typeof setTimeout> | null = null;
    const peers = new Map<string, LivePeer>();
    let iceServers = LIVE_FALLBACK_ICE;
    let deadline = 0;
    let warned = false;

    function release() {
      if (timer) clearInterval(timer);
      if (connectionTimer) clearTimeout(connectionTimer);
      for (const { pc } of Array.from(peers.values())) pc.close();
      peers.clear();
      media?.getTracks().forEach(track => track.stop());
      media = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      socket?.disconnect();
    }
    function finish(
      message?: string,
      notifyServer = true,
      notifyParent = true
    ) {
      if (finished) return;
      finished = true;
      if (message) toast.info(message);
      if (notifyServer) {
        socket?.emit("live:end", { streamId });
        // This is also needed when camera permissions fail before the socket exists.
        void apiRef.current.live.end.mutate({ streamId }).catch(() => {
          if (!disposed)
            toast.error(
              "Could not confirm the stream ended. It will expire automatically after 5 minutes."
            );
        });
      }
      release();
      if (!disposed && notifyParent) endedRef.current();
    }
    stopRef.current = () => finish();

    async function offerViewer(viewerSocketId: string, count: number) {
      if (finished || disposed || !media || !socket) return;
      setViewerCount(count);
      peers.get(viewerSocketId)?.pc.close();
      const pc = new RTCPeerConnection({ iceServers });
      const peer = { pc, ice: [] as RTCIceCandidateInit[] };
      peers.set(viewerSocketId, peer);
      media.getTracks().forEach(track => pc.addTrack(track, media!));
      pc.onicecandidate = event => {
        if (event.candidate && !finished)
          socket?.emit("live:ice", {
            targetSocketId: viewerSocketId,
            candidate: event.candidate.toJSON(),
          });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          pc.close();
          if (peers.get(viewerSocketId) === peer) peers.delete(viewerSocketId);
        }
      };
      try {
        await pc.setLocalDescription(await pc.createOffer());
        if (!finished && peers.get(viewerSocketId) === peer)
          socket.emit("live:offer", {
            targetSocketId: viewerSocketId,
            offer: pc.localDescription,
          });
      } catch {
        pc.close();
        if (peers.get(viewerSocketId) === peer) peers.delete(viewerSocketId);
      }
    }

    async function start() {
      const relayPromise = apiRef.current.calls.iceServers
        .query()
        .catch(() => null);
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error("Camera unavailable");
        const acquired = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 960 },
            height: { ideal: 540 },
            frameRate: { ideal: 24, max: 30 },
          },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (disposed || finished) {
          acquired.getTracks().forEach(track => track.stop());
          return;
        }
        media = acquired;
        media.getTracks().forEach(track => {
          track.onended = () =>
            finish("Camera or microphone stopped. Your live stream has ended.");
        });
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          videoRef.current.muted = true;
          void videoRef.current.play().catch(() => {});
        }
        setPhase("Connecting your live stream…");
        const relay = await relayPromise;
        if (disposed || finished) return;
        if (relay?.iceServers.length) iceServers = relay.iceServers;
        if (!relay?.relayConfigured)
          toast.warning(
            "Live streaming may not connect on every network because the relay service is unavailable."
          );
        socket = io({
          path: "/api/socket.io",
          transports: ["polling", "websocket"],
          withCredentials: true,
          reconnection: false,
        });
        connectionTimer = setTimeout(
          () => finish("Live streaming could not connect. Please try again."),
          20_000
        );
        socket.on("connect", () => socket?.emit("live:host", { streamId }));
        socket.on("connect_error", () =>
          finish(
            "Live streaming could not connect. Check your connection and sign-in, then try again."
          )
        );
        socket.on("disconnect", () => {
          if (!finished && !disposed)
            finish("Connection lost. Your live stream has ended.");
        });
        socket.on(
          "live:host:ready",
          ({
            expiresAt,
            serverNow,
          }: {
            expiresAt: number;
            serverNow: number;
          }) => {
            if (connectionTimer) clearTimeout(connectionTimer);
            // Convert the server's remaining duration into this browser's clock.
            deadline =
              Date.now() +
              Math.max(
                0,
                Math.min(LIVE_STREAM_DURATION_MS, expiresAt - serverNow)
              );
            setIsLive(true);
            function tick() {
              const remaining = liveStreamTimeLeft(deadline);
              setTimeLeft(remaining);
              if (!remaining)
                finish("Your live stream has ended after the 5-minute limit.");
            }
            tick();
            if (timer) clearInterval(timer);
            if (!finished) timer = setInterval(tick, 250);
          }
        );
        socket.on(
          "live:viewer:joined",
          ({
            viewerSocketId,
            viewerCount,
          }: {
            viewerSocketId: string;
            viewerCount: number;
          }) => {
            void offerViewer(viewerSocketId, viewerCount);
          }
        );
        socket.on("live:viewers", ({ viewerCount }: { viewerCount: number }) =>
          setViewerCount(viewerCount)
        );
        socket.on(
          "live:viewer:left",
          ({
            viewerSocketId,
            viewerCount,
          }: {
            viewerSocketId: string;
            viewerCount: number;
          }) => {
            setViewerCount(viewerCount);
            peers.get(viewerSocketId)?.pc.close();
            peers.delete(viewerSocketId);
          }
        );
        socket.on(
          "live:answer",
          async ({
            answer,
            viewerSocketId,
            senderSocketId,
          }: {
            answer: RTCSessionDescriptionInit;
            viewerSocketId: string;
            senderSocketId?: string;
          }) => {
            const peer = peers.get(viewerSocketId || senderSocketId || "");
            if (!peer || peer.pc.signalingState !== "have-local-offer") return;
            try {
              await peer.pc.setRemoteDescription(answer);
              await applyLiveIce(peer.pc, peer.ice);
            } catch {
              /* a viewer may leave during negotiation */
            }
          }
        );
        socket.on(
          "live:ice",
          async ({
            candidate,
            senderSocketId,
          }: {
            candidate: RTCIceCandidateInit;
            senderSocketId: string;
          }) => {
            const peer = peers.get(senderSocketId);
            if (!peer) return;
            peer.ice.push(candidate);
            await applyLiveIce(peer.pc, peer.ice);
          }
        );
        socket.on("live:time-warning", () => {
          if (!warned) {
            warned = true;
            toast.warning(
              "Your live stream will end in 30 seconds (5-minute limit).",
              { duration: 8000 }
            );
          }
        });
        socket.on("live:ended", ({ reason }: { reason?: string }) =>
          finish(
            reason === "time_limit"
              ? "Your live stream has ended after the 5-minute limit."
              : "Your live stream has ended.",
            false
          )
        );
        socket.on("live:error", ({ message }: { message: string }) => {
          toast.error(message);
          finish();
        });
      } catch (error) {
        if (!disposed && !finished) {
          toast.error(liveCameraError(error));
          finish();
        }
      }
    }
    void start();
    // Brief tab switches/permission prompts do not end a live stream. Leaving
    // the page or unmounting its panel still releases camera/mic immediately.
    const leavePage = () => finish(undefined, true, false);
    window.addEventListener("pagehide", leavePage);
    window.addEventListener("beforeunload", leavePage);
    return () => {
      disposed = true;
      window.removeEventListener("pagehide", leavePage);
      window.removeEventListener("beforeunload", leavePage);
      finish(undefined, true, false);
      release();
    };
  }, [streamId]);

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-black text-white"
      style={{ aspectRatio: "16/9" }}
      data-live-broadcast={streamId}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-contain"
        aria-label="Your live camera preview"
      />
      <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-md bg-[var(--its-red)] px-2.5 py-1 text-white">
        <Radio size={13} className={isLive ? "animate-pulse" : ""} />
        <span className="text-xs font-bold">
          {isLive ? "LIVE" : "Preparing"}
        </span>
      </div>
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <span
          className="flex items-center gap-1 rounded-md bg-black/75 px-2 py-1 text-xs"
          aria-label={`${viewerCount} viewers`}
        >
          <Users size={13} />
          {viewerCount}
        </span>
        <span
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold tabular-nums ${timeLeft <= 30000 ? "bg-[var(--its-red)]" : "bg-black/75"}`}
          aria-label="Live time remaining"
          data-live-countdown
        >
          <Clock size={13} />
          {formatLiveStreamTime(timeLeft)}
        </span>
      </div>
      {!isLive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-5 text-center text-white">
          <Loader2 size={24} className="animate-spin" />
          <p className="text-sm">{phase}</p>
        </div>
      )}
      <button
        type="button"
        onClick={() => stopRef.current()}
        className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-md bg-[var(--its-red)] px-3 py-2 text-xs font-bold text-white hover:opacity-90"
        aria-label="End live stream"
      >
        <Square size={13} />
        End live
      </button>
    </div>
  );
}
