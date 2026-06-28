/**
 * CallModal — reusable one-to-one WebRTC voice/video call overlay.
 *
 * Usage:
 *   <CallModal
 *     peerId={userId}
 *     peerName="Alice"
 *     peerAvatar="/path/to/avatar.jpg"
 *     isVideo={true}
 *     onClose={() => setCallOpen(false)}
 *   />
 *
 * For incoming calls, pass `incomingOffer` (RTCSessionDescriptionInit).
 * The modal handles the full call lifecycle: calling → connected → ended.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneIncoming,
  PhoneMissed,
  ScreenShare,
  ScreenShareOff,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type CallPhase = "calling" | "incoming" | "connected" | "ended";

interface CallModalProps {
  /** ID of the remote user */
  peerId: number;
  peerName: string;
  peerAvatar?: string | null;
  /** true = video call, false = voice only */
  isVideo: boolean;
  /** If provided, this is an incoming call — we received the offer already */
  incomingOffer?: RTCSessionDescriptionInit;
  /** Called when the modal should be closed */
  onClose: () => void;
  /** Shared socket ref from the parent (optional — we create our own if not provided) */
  socketRef?: React.MutableRefObject<any>;
}

export default function CallModal({
  peerId,
  peerName,
  peerAvatar,
  isVideo,
  incomingOffer,
  onClose,
  socketRef: externalSocketRef,
}: CallModalProps) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<CallPhase>(incomingOffer ? "incoming" : "calling");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const internalSocketRef = useRef<any>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // Use external socket if provided, otherwise create our own
  const getSocket = useCallback(() => {
    return externalSocketRef?.current ?? internalSocketRef.current;
  }, [externalSocketRef]);

  // Connect socket if we don't have an external one
  useEffect(() => {
    if (externalSocketRef?.current || !user) return;
    import("socket.io-client")
      .then(({ io }) => {
        const socket = io(window.location.origin, {
          path: "/api/socket.io",
          query: { userId: user.id },
        });
        internalSocketRef.current = socket;
      })
      .catch(() => {});
    return () => {
      internalSocketRef.current?.disconnect();
    };
  }, [user, externalSocketRef]);

  // Set up socket event listeners
  useEffect(() => {
    if (!user) return;
    const checkSocket = setInterval(() => {
      const socket = getSocket();
      if (!socket) return;
      clearInterval(checkSocket);

      socket.on("call:answer", async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        if (!isMountedRef.current) return;
        if (pcRef.current) {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          } catch {}
        }
      });

      socket.on("call:ice", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        if (!isMountedRef.current) return;
        if (pcRef.current && candidate) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {}
        }
      });

      socket.on("call:hangup", () => {
        if (!isMountedRef.current) return;
        toast.info(`${peerName} ended the call.`);
        cleanup();
        onClose();
      });
    }, 200);

    return () => clearInterval(checkSocket);
  }, [user, peerName, onClose, getSocket]);

  // Auto-start outgoing call
  useEffect(() => {
    if (incomingOffer) return; // incoming — wait for user to accept
    const checkSocket = setInterval(() => {
      const socket = getSocket();
      if (!socket || !user) return;
      clearInterval(checkSocket);
      startOutgoingCall();
    }, 300);
    return () => clearInterval(checkSocket);
  }, [incomingOffer, user]);

  // Duration timer when connected
  useEffect(() => {
    if (phase === "connected") {
      durationTimerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, []);

  function createPeerConnection() {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        getSocket()?.emit("call:ice", { to: peerId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        if (isMountedRef.current) setPhase("connected");
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        if (isMountedRef.current) {
          cleanup();
          onClose();
        }
      }
    };

    return pc;
  }

  async function startOutgoingCall() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });
      localStreamRef.current = stream;
      cameraVideoTrackRef.current = stream.getVideoTracks()[0] ?? null;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      getSocket()?.emit("call:offer", {
        to: peerId,
        from: user!.id,
        fromName: user!.name,
        offer,
        isVideo,
      });

      if (isMountedRef.current) setPhase("calling");
    } catch (err: any) {
      toast.error("Could not access camera/microphone: " + (err.message ?? "Unknown error"));
      onClose();
    }
  }

  async function acceptIncomingCall() {
    if (!incomingOffer) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });
      localStreamRef.current = stream;
      cameraVideoTrackRef.current = stream.getVideoTracks()[0] ?? null;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      getSocket()?.emit("call:answer", { to: peerId, answer });
      if (isMountedRef.current) setPhase("connected");
    } catch (err: any) {
      toast.error("Could not accept call: " + (err.message ?? "Unknown error"));
      onClose();
    }
  }

  function declineCall() {
    getSocket()?.emit("call:hangup", { to: peerId });
    cleanup();
    onClose();
  }

  function hangUp() {
    getSocket()?.emit("call:hangup", { to: peerId });
    cleanup();
    onClose();
  }

  function cleanup() {
    pcRef.current?.close();
    pcRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    cameraVideoTrackRef.current = null;
    setIsScreenSharing(false);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }

  function toggleMic() {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn((v) => !v);
  }

  function toggleCam() {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = !camOn));
    setCamOn((v) => !v);
  }

  async function replaceOutgoingVideoTrack(track: MediaStreamTrack | null) {
    const pc = pcRef.current;
    if (!pc || !track) return false;
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (!sender) return false;
    await sender.replaceTrack(track);
    return true;
  }

  async function stopScreenShare() {
    const cameraTrack = cameraVideoTrackRef.current ?? localStreamRef.current?.getVideoTracks()[0] ?? null;
    try {
      await replaceOutgoingVideoTrack(cameraTrack);
      if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    } catch {}
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);
  }

  async function toggleScreenShare() {
    if (!isVideo || phase !== "connected") return;
    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error("Screen sharing is not supported in this browser.");
      return;
    }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) return;
      const replaced = await replaceOutgoingVideoTrack(screenTrack);
      if (!replaced) {
        screenStream.getTracks().forEach((track) => track.stop());
        toast.error("Screen sharing is available after the video connection starts.");
        return;
      }
      screenStreamRef.current = screenStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
      setIsScreenSharing(true);
      screenTrack.onended = () => stopScreenShare();
      toast.success("Screen sharing started.");
    } catch (err: any) {
      if (err?.name !== "NotAllowedError") toast.error("Could not start screen sharing.");
    }
  }

  function formatDuration(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className={cn(
          "relative bg-gray-900 text-white rounded-2xl shadow-2xl overflow-hidden flex flex-col",
          isVideo && phase === "connected"
            ? "w-full max-w-2xl"
            : "w-full max-w-sm"
        )}
      >
        {/* ── Incoming call screen ── */}
        {phase === "incoming" && (
          <div className="flex flex-col items-center gap-6 p-10">
            <p className="text-sm text-gray-400 uppercase tracking-widest">
              Incoming {isVideo ? "Video" : "Voice"} Call
            </p>
            <Avatar className="w-24 h-24 ring-4 ring-green-500/50">
              <AvatarImage src={peerAvatar ?? undefined} />
              <AvatarFallback className="text-2xl bg-gray-700">
                {getInitials(peerName)}
              </AvatarFallback>
            </Avatar>
            <p className="text-2xl font-bold">{peerName}</p>
            <div className="flex gap-8 mt-2">
              <button
                onClick={declineCall}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center group-hover:bg-red-700 transition-colors">
                  <PhoneMissed className="w-7 h-7" />
                </div>
                <span className="text-xs text-gray-400">Decline</span>
              </button>
              <button
                onClick={acceptIncomingCall}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center group-hover:bg-green-700 transition-colors">
                  <Phone className="w-7 h-7" />
                </div>
                <span className="text-xs text-gray-400">Accept</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Calling (waiting for answer) ── */}
        {phase === "calling" && (
          <div className="flex flex-col items-center gap-6 p-10">
            <p className="text-sm text-gray-400 uppercase tracking-widest">
              {isVideo ? "Video" : "Voice"} Call
            </p>
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={peerAvatar ?? undefined} />
                <AvatarFallback className="text-2xl bg-gray-700">
                  {getInitials(peerName)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-gray-900 animate-pulse" />
            </div>
            <p className="text-2xl font-bold">{peerName}</p>
            <p className="text-gray-400 animate-pulse">Calling…</p>
            <button
              onClick={hangUp}
              className="mt-4 w-16 h-16 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition-colors"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </div>
        )}

        {/* ── Connected ── */}
        {phase === "connected" && (
          <>
            {isVideo ? (
              /* Video call */
              <div className="relative bg-black aspect-video">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {/* Local PiP */}
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute bottom-4 right-4 w-32 h-24 rounded-xl object-cover border-2 border-white/30"
                />
                {/* Name + duration overlay */}
                <div className="absolute top-4 left-4 bg-black/50 rounded-lg px-3 py-1 text-sm">
                  {peerName} · {formatDuration(callDuration)}
                </div>
              </div>
            ) : (
              /* Voice call */
              <div className="flex flex-col items-center gap-4 py-12 px-8">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={peerAvatar ?? undefined} />
                  <AvatarFallback className="text-2xl bg-gray-700">
                    {getInitials(peerName)}
                  </AvatarFallback>
                </Avatar>
                <p className="text-2xl font-bold">{peerName}</p>
                <p className="text-green-400 font-mono">{formatDuration(callDuration)}</p>
                {/* Hidden video elements for audio tracks */}
                <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
                <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 p-5 bg-gray-800">
              <button
                onClick={toggleMic}
                title={micOn ? "Mute" : "Unmute"}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                  micOn ? "bg-gray-600 hover:bg-gray-500" : "bg-red-600 hover:bg-red-700"
                )}
              >
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              {isVideo && (
                <button
                  onClick={toggleCam}
                  title={camOn ? "Turn off camera" : "Turn on camera"}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                    camOn ? "bg-gray-600 hover:bg-gray-500" : "bg-red-600 hover:bg-red-700"
                  )}
                >
                  {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
              )}

              {isVideo && (
                <button
                  onClick={toggleScreenShare}
                  title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                    isScreenSharing ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-500"
                  )}
                >
                  {isScreenSharing ? <ScreenShareOff className="w-5 h-5" /> : <ScreenShare className="w-5 h-5" />}
                </button>
              )}

              <button
                onClick={hangUp}
                title="End call"
                className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition-colors"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
