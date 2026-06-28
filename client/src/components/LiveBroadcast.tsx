import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Radio, X, Users, Clock } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const STREAM_DURATION_MS = 3 * 60 * 1000; // 3 minutes

interface LiveBroadcastProps {
  streamId: number;
  hostId: number;
  onEnded: () => void;
}

export default function LiveBroadcast({ streamId, hostId, onEnded }: LiveBroadcastProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupDoneRef = useRef(false);

  const [viewerCount, setViewerCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(STREAM_DURATION_MS);
  const [isLive, setIsLive] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const endMutation = (trpc as any).live.end.useMutation();

  /**
   * Force cleanup of all resources (webcam, socket, peer connections)
   * This is called on page leave, tab close, or stream end
   */
  const forceCleanup = useCallback(async () => {
    if (cleanupDoneRef.current) return; // Prevent double cleanup
    cleanupDoneRef.current = true;

    console.log("[LiveBroadcast] Force cleanup triggered");

    // 1. Stop the countdown timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 2. Close all peer connections
    peersRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch (e) {
        console.error("Error closing peer connection:", e);
      }
    });
    peersRef.current.clear();

    // 3. Stop all media tracks (CRITICAL: this stops the webcam)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
          console.log(`[LiveBroadcast] Stopped ${track.kind} track`);
        } catch (e) {
          console.error(`Error stopping ${track.kind} track:`, e);
        }
      });
      streamRef.current = null;
    }

    // 4. Clear video element source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // 5. Disconnect socket and notify server
    if (socketRef.current?.connected) {
      try {
        socketRef.current.emit("live:end", { streamId, hostId });
        socketRef.current.disconnect();
      } catch (e) {
        console.error("Error disconnecting socket:", e);
      }
    }
    socketRef.current = null;

    // 6. Notify backend that stream ended
    try {
      await endMutation.mutateAsync({ streamId });
    } catch (e) {
      console.error("Error notifying backend of stream end:", e);
    }

    // 7. Call the onEnded callback
    onEnded();
  }, [streamId, hostId, onEnded, endMutation]);

  const endStream = useCallback(async () => {
    await forceCleanup();
  }, [forceCleanup]);

  useEffect(() => {
    let countdown: ReturnType<typeof setInterval>;

    async function start() {
      // Get camera + mic
      let localStream: MediaStream;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        toast.error("Camera/microphone access denied. Please allow access to go live.");
        onEnded();
        return;
      }
      streamRef.current = localStream;
      if (videoRef.current) {
        videoRef.current.srcObject = localStream;
        videoRef.current.muted = true; // prevent echo for host
      }

      // Connect socket
      const socket = io({ path: "/api/socket.io", transports: ["websocket"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("live:host", { streamId });
      });

      socket.on("live:host:ready", () => {
        setIsLive(true);
        // Start countdown
        const endAt = Date.now() + STREAM_DURATION_MS;
        countdown = setInterval(() => {
          const remaining = endAt - Date.now();
          if (remaining <= 0) {
            clearInterval(countdown);
            endStream();
          } else {
            setTimeLeft(remaining);
          }
        }, 500);
        timerRef.current = countdown as unknown as ReturnType<typeof setTimeout>;
      });

      // A viewer joined — create a peer connection and send offer
      socket.on("live:viewer:joined", async ({ viewerSocketId, viewerCount: vc }: { viewerSocketId: string; viewerCount: number }) => {
        setViewerCount(vc);
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        peersRef.current.set(viewerSocketId, pc);

        // Add tracks
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit("live:ice", { targetSocketId: viewerSocketId, candidate: e.candidate });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("live:offer", { targetSocketId: viewerSocketId, offer });
      });

      socket.on("live:viewer:left", ({ viewerSocketId, viewerCount: vc }: { viewerSocketId: string; viewerCount: number }) => {
        setViewerCount(vc);
        peersRef.current.get(viewerSocketId)?.close();
        peersRef.current.delete(viewerSocketId);
      });

      socket.on("live:answer", async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        // Find the peer that is awaiting an answer — last created
        for (const [, pc] of Array.from(peersRef.current)) {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            break;
          }
        }
      });

      socket.on("live:ice", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        for (const [, pc] of Array.from(peersRef.current)) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
        }
      });

      socket.on("live:error", ({ message }: { message: string }) => {
        toast.error(message);
        endStream();
      });

      // Server warns 30 s before auto-end
      socket.on("live:time-warning", ({ secondsLeft }: { secondsLeft: number }) => {
        toast.warning(`⏱ Stream will auto-end in ${secondsLeft} seconds due to the time limit.`, { duration: 8000 });
      });

      // Server force-ended the stream (time limit reached)
      socket.on("live:ended", ({ reason }: { reason?: string }) => {
        if (reason === "time_limit") {
          toast.error("Stream ended: time limit reached.");
        }
        endStream();
      });
    }

    start();

    /**
     * Cleanup handlers for various page leave scenarios
     */
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // This runs when user tries to close tab or navigate away
      forceCleanup();
      e.preventDefault();
      e.returnValue = "";
    };

    const handleUnload = () => {
      // Final cleanup on page unload
      forceCleanup();
    };

    const handleVisibilityChange = () => {
      // If tab becomes hidden, stop the stream
      if (document.hidden) {
        console.log("[LiveBroadcast] Tab hidden, stopping stream");
        forceCleanup();
      }
    };

    const handlePageHide = () => {
      // Mobile Safari: page is being hidden
      console.log("[LiveBroadcast] Page hidden, stopping stream");
      forceCleanup();
    };

    // Register all cleanup handlers
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("unload", handleUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      // Remove event listeners
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("unload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);

      // Final cleanup
      clearInterval(countdown);
      forceCleanup();
    };
  }, [streamId, endStream, onEnded, forceCleanup]);

  const formatTime = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="relative bg-primary" style={{ aspectRatio: "16/9" }}>
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />

      {/* Live badge */}
      {isLive && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[var(--its-red)] px-2 py-1">
          <Radio size={12} className="text-primary-foreground animate-pulse" />
          <span className="text-primary-foreground text-xs font-bold tracking-widest uppercase">Live</span>
        </div>
      )}

      {/* Viewer count */}
      <div className="absolute top-3 right-12 flex items-center gap-1 bg-black/60 px-2 py-1">
        <Users size={12} className="text-primary-foreground" />
        <span className="text-primary-foreground text-xs font-bold">{viewerCount}</span>
      </div>

      {/* Countdown */}
      <div className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-1 ${timeLeft < 60000 ? "bg-[var(--its-red)]" : "bg-black/60"}`}>
        <Clock size={12} className="text-primary-foreground" />
        <span className="text-primary-foreground text-xs font-bold tabular-nums">{formatTime(timeLeft)}</span>
      </div>

      {/* End button */}
      <button
        onClick={endStream}
        className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-[var(--its-red)] hover:bg-red-700 px-3 py-1.5 transition-colors"
        title="End stream"
      >
        <X size={14} className="text-primary-foreground" />
        <span className="text-primary-foreground text-xs font-bold tracking-widest uppercase">End</span>
      </button>

      {!isLive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <p className="text-primary-foreground text-sm font-bold tracking-widest uppercase animate-pulse">Starting…</p>
        </div>
      )}
    </div>
  );
}
