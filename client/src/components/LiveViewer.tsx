import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Radio, Users, WifiOff } from "lucide-react";
import { toast } from "sonner";

interface LiveViewerProps {
  streamId: number;
  hostName?: string;
  onEnded?: () => void;
}

export default function LiveViewer({ streamId, hostName, onEnded }: LiveViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const cleanupDoneRef = useRef(false);

  const [viewerCount, setViewerCount] = useState(0);
  const [status, setStatus] = useState<"connecting" | "watching" | "ended">("connecting");

  /**
   * Force cleanup of all resources (peer connection, socket)
   */
  const forceCleanup = () => {
    if (cleanupDoneRef.current) return; // Prevent double cleanup
    cleanupDoneRef.current = true;

    console.log("[LiveViewer] Force cleanup triggered");

    // 1. Close peer connection
    if (pcRef.current) {
      try {
        pcRef.current.close();
        console.log("[LiveViewer] Closed peer connection");
      } catch (e) {
        console.error("Error closing peer connection:", e);
      }
      pcRef.current = null;
    }

    // 2. Clear video element source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // 3. Disconnect socket
    if (socketRef.current?.connected) {
      try {
        socketRef.current.disconnect();
        console.log("[LiveViewer] Disconnected socket");
      } catch (e) {
        console.error("Error disconnecting socket:", e);
      }
    }
    socketRef.current = null;

    // 4. Update status
    setStatus("ended");
  };

  useEffect(() => {
    const socket = io({ path: "/api/socket.io", transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("live:join", { streamId });
    });

    socket.on("live:joined", ({ viewerCount: vc }: { viewerCount: number }) => {
      setViewerCount(vc);
    });

    // Host sends an offer
    socket.on("live:offer", async ({ offer, hostSocketId }: { offer: RTCSessionDescriptionInit; hostSocketId: string }) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      pc.ontrack = (e) => {
        if (videoRef.current && e.streams[0]) {
          videoRef.current.srcObject = e.streams[0];
          setStatus("watching");
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("live:ice", { targetSocketId: hostSocketId, candidate: e.candidate });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("live:answer", { targetSocketId: hostSocketId, answer });
    });

    socket.on("live:ice", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    });

    socket.on("live:ended", () => {
      console.log("[LiveViewer] Stream ended by host");
      forceCleanup();
      toast.info("The live stream has ended.");
      onEnded?.();
    });

    socket.on("live:error", ({ message }: { message: string }) => {
      toast.error(message);
      forceCleanup();
      onEnded?.();
    });

    /**
     * Cleanup handlers for various page leave scenarios
     */
    const handleBeforeUnload = () => {
      forceCleanup();
    };

    const handleUnload = () => {
      forceCleanup();
    };

    const handleVisibilityChange = () => {
      // If tab becomes hidden, stop watching
      if (document.hidden) {
        console.log("[LiveViewer] Tab hidden, stopping viewer");
        forceCleanup();
      }
    };

    const handlePageHide = () => {
      // Mobile Safari: page is being hidden
      console.log("[LiveViewer] Page hidden, stopping viewer");
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
      forceCleanup();
    };
  }, [streamId, onEnded]);

  return (
    <div className="relative bg-primary" style={{ aspectRatio: "16/9" }}>
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />

      {/* Live badge */}
      {status === "watching" && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[var(--its-red)] px-2 py-1">
          <Radio size={12} className="text-primary-foreground animate-pulse" />
          <span className="text-primary-foreground text-xs font-bold tracking-widest uppercase">Live</span>
        </div>
      )}

      {/* Viewer count */}
      {status === "watching" && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 px-2 py-1">
          <Users size={12} className="text-primary-foreground" />
          <span className="text-primary-foreground text-xs font-bold">{viewerCount}</span>
        </div>
      )}

      {/* Host name */}
      {hostName && status === "watching" && (
        <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1">
          <span className="text-primary-foreground text-xs font-bold">{hostName}</span>
        </div>
      )}

      {/* Connecting overlay */}
      {status === "connecting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2">
          <Radio size={24} className="text-[var(--its-red)] animate-pulse" />
          <p className="text-primary-foreground text-sm font-bold tracking-widest uppercase">Connecting…</p>
        </div>
      )}

      {/* Ended overlay */}
      {status === "ended" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2">
          <WifiOff size={24} className="text-muted-foreground" />
          <p className="text-primary-foreground text-sm font-bold tracking-widest uppercase">Stream Ended</p>
        </div>
      )}
    </div>
  );
}
