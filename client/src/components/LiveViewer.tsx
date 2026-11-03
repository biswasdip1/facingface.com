import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  Radio,
  Users,
  WifiOff,
  Volume2,
  VolumeX,
  RefreshCw,
  Clock,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  LIVE_STREAM_DURATION_MS,
  formatLiveStreamTime,
  liveStreamTimeLeft,
} from "@shared/liveStream";
import { LIVE_FALLBACK_ICE, applyLiveIce } from "@/lib/liveStreamMedia";

type LiveViewerProps = {
  streamId: number;
  hostName?: string;
  onEnded?: () => void;
};

export default function LiveViewer({
  streamId,
  hostName,
  onEnded,
}: LiveViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const endRef = useRef(onEnded);
  endRef.current = onEnded;
  const utils = trpc.useUtils();
  const apiRef = useRef(utils.client);
  apiRef.current = utils.client;
  const [viewerCount, setViewerCount] = useState(0);
  const [status, setStatus] = useState<
    "connecting" | "watching" | "ended" | "error"
  >("connecting");
  const [message, setMessage] = useState("");
  const [muted, setMuted] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [timeLeft, setTimeLeft] = useState(LIVE_STREAM_DURATION_MS);

  useEffect(() => {
    let disposed = false;
    let finished = false;
    let socket: ReturnType<typeof io> | null = null;
    let pc: RTCPeerConnection | null = null;
    let hostSocketId = "";
    let remote: MediaStream | null = null;
    const earlyIce = new Map<string, RTCIceCandidateInit[]>();
    let timer: ReturnType<typeof setInterval> | null = null;
    let connectionTimer: ReturnType<typeof setTimeout> | null = null;
    let iceServers = LIVE_FALLBACK_ICE;
    setStatus("connecting");
    setMessage("");
    setMuted(true);
    setViewerCount(0);

    function release() {
      if (timer) clearInterval(timer);
      if (connectionTimer) clearTimeout(connectionTimer);
      pc?.close();
      pc = null;
      remote?.getTracks().forEach(track => track.stop());
      remote = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      socket?.emit("live:leave", { streamId });
      socket?.disconnect();
    }
    function fail(reason: string) {
      if (disposed || finished) return;
      finished = true;
      release();
      setMessage(reason);
      setStatus("error");
    }
    function ended(reason?: string) {
      if (disposed || finished) return;
      finished = true;
      release();
      setMessage(
        reason === "time_limit"
          ? "This live stream reached its 5-minute limit."
          : "This live stream has ended."
      );
      setStatus("ended");
      endRef.current?.();
    }
    async function start() {
      const relay = await apiRef.current.calls.iceServers
        .query()
        .catch(() => null);
      if (disposed || finished) return;
      if (relay?.iceServers.length) iceServers = relay.iceServers;
      socket = io({
        path: "/api/socket.io",
        transports: ["polling", "websocket"],
        withCredentials: true,
        reconnection: false,
      });
      connectionTimer = setTimeout(
        () =>
          fail(
            "The live video could not connect. Check your connection, then retry."
          ),
        25_000
      );
      socket.on("connect", () => socket?.emit("live:join", { streamId }));
      socket.on("connect_error", () =>
        fail(
          "Could not join the live stream. Check your connection and sign-in, then retry."
        )
      );
      socket.on("disconnect", () => {
        if (!finished && !disposed)
          fail(
            "The live connection was interrupted. You can try reconnecting."
          );
      });
      socket.on(
        "live:joined",
        ({
          viewerCount,
          expiresAt,
          serverNow,
        }: {
          viewerCount: number;
          expiresAt: number;
          serverNow: number;
        }) => {
          setViewerCount(viewerCount);
          const deadline =
            Date.now() +
            Math.max(
              0,
              Math.min(LIVE_STREAM_DURATION_MS, expiresAt - serverNow)
            );
          const tick = () => {
            const remaining = liveStreamTimeLeft(deadline);
            setTimeLeft(remaining);
            if (!remaining) ended("time_limit");
          };
          tick();
          if (timer) clearInterval(timer);
          if (!finished) timer = setInterval(tick, 500);
        }
      );
      socket.on("live:viewers", ({ viewerCount }: { viewerCount: number }) =>
        setViewerCount(viewerCount)
      );
      socket.on(
        "live:offer",
        async ({
          offer,
          hostSocketId: host,
        }: {
          offer: RTCSessionDescriptionInit;
          hostSocketId: string;
        }) => {
          if (disposed || finished) return;
          pc?.close();
          hostSocketId = host;
          const peer = new RTCPeerConnection({ iceServers });
          pc = peer;
          remote = new MediaStream();
          peer.ontrack = event => {
            if (disposed || finished || pc !== peer) return;
            const trackStream = event.streams[0];
            if (trackStream) remote = trackStream;
            else if (
              remote &&
              !remote.getTracks().some(track => track.id === event.track.id)
            )
              remote.addTrack(event.track);
            if (videoRef.current && remote) {
              videoRef.current.srcObject = remote;
              videoRef.current.muted = true;
              void videoRef.current.play().catch(() => {});
              setMuted(true);
              setStatus("watching");
            }
          };
          peer.onicecandidate = event => {
            if (event.candidate && !finished)
              socket?.emit("live:ice", {
                targetSocketId: host,
                candidate: event.candidate.toJSON(),
              });
          };
          peer.onconnectionstatechange = () => {
            if (
              peer.connectionState === "connected" &&
              pc === peer &&
              connectionTimer
            )
              clearTimeout(connectionTimer);
            if (peer.connectionState === "failed" && pc === peer)
              fail(
                "The live video connection failed. Check your network, then retry."
              );
          };
          try {
            await peer.setRemoteDescription(offer);
            await applyLiveIce(peer, earlyIce.get(host) ?? []);
            await peer.setLocalDescription(await peer.createAnswer());
            if (!finished && !disposed && pc === peer)
              socket?.emit("live:answer", {
                targetSocketId: host,
                answer: peer.localDescription,
              });
          } catch {
            if (!finished && !disposed)
              fail("Could not start live playback. Please retry.");
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
          const queue = earlyIce.get(senderSocketId) ?? [];
          queue.push(candidate);
          earlyIce.set(senderSocketId, queue);
          if (pc && senderSocketId === hostSocketId)
            await applyLiveIce(pc, queue);
        }
      );
      socket.on("live:ended", ({ reason }: { reason?: string }) =>
        ended(reason)
      );
      socket.on("live:error", ({ message }: { message: string }) => {
        if (/not active|already ended|expired|not found/i.test(message))
          ended();
        else fail(message);
      });
    }
    void start();
    const leavePage = () => {
      finished = true;
      release();
    };
    window.addEventListener("pagehide", leavePage);
    return () => {
      disposed = true;
      finished = true;
      window.removeEventListener("pagehide", leavePage);
      release();
    };
  }, [streamId, attempt]);

  async function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !muted;
    setMuted(!muted);
    try {
      await video.play();
    } catch {
      setMessage("Tap the video to start playback.");
    }
  }
  return (
    <div
      className="relative overflow-hidden rounded-xl bg-black text-white"
      style={{ aspectRatio: "16/9" }}
      data-live-viewer={streamId}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-contain"
        aria-label={`${hostName || "Member"}'s live video`}
        onClick={() => {
          void videoRef.current?.play().catch(() => {});
        }}
      />
      {status === "watching" && (
        <>
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-[var(--its-red)] px-2 py-1 text-xs font-bold">
            <Radio size={13} />
            LIVE
          </div>
          <div className="absolute right-3 top-3 flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 rounded-md bg-black/75 px-2 py-1">
              <Users size={13} />
              {viewerCount}
            </span>
            <span className="flex items-center gap-1 rounded-md bg-black/75 px-2 py-1 tabular-nums">
              <Clock size={13} />
              {formatLiveStreamTime(timeLeft)}
            </span>
          </div>
          {hostName && (
            <div className="absolute bottom-3 left-3 max-w-[55%] truncate rounded-md bg-black/75 px-2 py-1 text-xs font-bold">
              {hostName}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              void toggleSound();
            }}
            className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-black/80 px-3 py-2 text-xs font-bold text-white"
            aria-label={muted ? "Turn on live sound" : "Mute live sound"}
          >
            {muted ? <Volume2 size={15} /> : <VolumeX size={15} />}
            {muted ? "Turn on sound" : "Mute"}
          </button>
        </>
      )}
      {status === "connecting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/75 p-5 text-center">
          <Radio size={24} className="animate-pulse" />
          <p className="text-sm">Connecting to live video…</p>
        </div>
      )}
      {(status === "error" || status === "ended") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-5 text-center">
          <WifiOff size={24} />
          <p className="text-sm">{message}</p>
          {status === "error" && (
            <button
              type="button"
              className="flex items-center gap-1 rounded-md bg-[var(--its-red)] px-3 py-2 text-sm font-bold"
              onClick={() => setAttempt(value => value + 1)}
            >
              <RefreshCw size={14} />
              Retry live video
            </button>
          )}
        </div>
      )}
    </div>
  );
}
