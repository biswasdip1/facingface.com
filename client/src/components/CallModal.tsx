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
import { trpc } from "@/lib/trpc";

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

type CallPhase = "calling" | "incoming" | "connecting" | "connected" | "ended";

interface CallModalProps {
  /** ID of the remote user */
  peerId: number;
  peerName: string;
  peerAvatar?: string | null;
  /** true = video call, false = voice only */
  isVideo: boolean;
  /** If provided, this is an incoming call — we received the offer already */
  incomingOffer?: RTCSessionDescriptionInit;
  /** ICE candidates received before the incoming call panel finished mounting. */
  incomingCandidates?: RTCIceCandidateInit[];
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
  incomingCandidates = [],
  onClose,
  socketRef: externalSocketRef,
}: CallModalProps) {
  const { user } = useAuth();
  const { data: relayConfig, isLoading: relayConfigLoading } = trpc.calls.iceServers.useQuery(undefined, {
    staleTime: 45 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const [phase, setPhase] = useState<CallPhase>(incomingOffer ? "incoming" : "calling");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const queuedIncomingCandidateKeysRef = useRef(new Set<string>());
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const internalSocketRef = useRef<any>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringtoneContextRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const stopRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    const context = ringtoneContextRef.current;
    ringtoneContextRef.current = null;
    if (context && context.state !== "closed") {
      context.close().catch(() => {});
    }
  }, []);

  const startRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current || typeof window === "undefined") return;

    try {
      const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return;

      const context = new AudioContextConstructor();
      ringtoneContextRef.current = context;
      context.resume().catch(() => {});

      const playRing = () => {
        const now = context.currentTime;
        [0, 0.24].forEach((offset) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(880, now + offset);
          gain.gain.setValueAtTime(0.0001, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.075, now + offset + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
          oscillator.connect(gain).connect(context.destination);
          oscillator.start(now + offset);
          oscillator.stop(now + offset + 0.2);
        });
      };

      playRing();
      ringtoneIntervalRef.current = setInterval(playRing, 1800);
    } catch {
      // Browsers may prevent sound before a user interaction. The visible call
      // status remains available and audio is retried on later call actions.
    }
  }, []);

  const attachRemoteMedia = useCallback(() => {
    const stream = remoteStreamRef.current;
    if (!stream) return;

    // Always use a dedicated audio element for the remote microphone track.
    // It prevents audio from depending on whether a video panel has rendered.
    if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== stream) {
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.play().catch(() => {});
    }

    if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== stream) {
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, []);

  const flushPendingIceCandidates = useCallback(async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription) return;
    const candidates = pendingIceCandidatesRef.current.splice(0);
    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // A duplicate or expired candidate is safe to ignore; later candidates
        // can still establish the media route.
      }
    }
  }, []);

  // Candidate packets can arrive directly after an offer, before React has
  // mounted this dialog. Keep the parent's buffered candidates exactly once.
  useEffect(() => {
    for (const candidate of incomingCandidates) {
      if (!candidate) continue;
      const key = JSON.stringify(candidate);
      if (queuedIncomingCandidateKeysRef.current.has(key)) continue;
      queuedIncomingCandidateKeysRef.current.add(key);
      pendingIceCandidatesRef.current.push(candidate);
    }
    const pc = pcRef.current;
    if (pc?.remoteDescription) flushPendingIceCandidates(pc);
  }, [incomingCandidates, flushPendingIceCandidates]);

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

  // Register signaling handlers as soon as the shared socket is available.
  // The previous 200 ms polling gap could lose the first ICE candidates on a
  // fast mobile network, leaving a timer running without a usable media path.
  useEffect(() => {
    if (!user) return;
    let attachedSocket: any = null;
    let checkSocket: ReturnType<typeof setInterval> | null = null;

    const handleAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      if (!isMountedRef.current || !pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingIceCandidates(pcRef.current);
        if (isMountedRef.current) setPhase("connecting");
      } catch {
        toast.error("The call answer could not be connected.");
      }
    };
    const handleIce = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (!isMountedRef.current || !candidate) return;
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Candidate delivery can overlap with offer/answer processing.
        // Later candidates can still establish the media route.
      }
    };
    const handleHangup = () => {
      if (!isMountedRef.current) return;
      toast.info(`${peerName} ended the call.`);
      cleanup();
      onClose();
    };
    const attach = (socket: any) => {
      if (attachedSocket) return;
      attachedSocket = socket;
      socket.on("call:answer", handleAnswer);
      socket.on("call:ice", handleIce);
      socket.on("call:hangup", handleHangup);
    };

    const availableSocket = getSocket();
    if (availableSocket) attach(availableSocket);
    else {
      checkSocket = setInterval(() => {
        const socket = getSocket();
        if (!socket) return;
        if (checkSocket) clearInterval(checkSocket);
        checkSocket = null;
        attach(socket);
      }, 25);
    }

    return () => {
      if (checkSocket) clearInterval(checkSocket);
      if (attachedSocket) {
        attachedSocket.off("call:answer", handleAnswer);
        attachedSocket.off("call:ice", handleIce);
        attachedSocket.off("call:hangup", handleHangup);
      }
    };
  }, [user, peerName, onClose, getSocket, flushPendingIceCandidates]);

  // Auto-start outgoing call
  useEffect(() => {
    if (incomingOffer) return; // incoming — wait for user to accept
    const checkSocket = setInterval(() => {
      const socket = getSocket();
      if (!socket || !user || relayConfigLoading) return;
      clearInterval(checkSocket);
      startOutgoingCall();
    }, 300);
    return () => clearInterval(checkSocket);
  }, [incomingOffer, user, relayConfigLoading]);

  // Ring while a call is outgoing or awaiting a response. The browser may
  // silence an unsolicited incoming sound, but calls started by the member
  // immediately play this audible, repeating tone where permitted.
  useEffect(() => {
    if (phase === "calling" || phase === "incoming") startRingtone();
    else stopRingtone();
    return () => stopRingtone();
  }, [phase, startRingtone, stopRingtone]);

  // A remote track can arrive before the connected UI mounts. Reattach the
  // retained stream when the visible call panel becomes available.
  useEffect(() => {
    if (phase === "connected") attachRemoteMedia();
  }, [phase, isVideo, attachRemoteMedia]);

  // Do not leave a person on a silent Connecting screen forever when their
  // current network blocks direct WebRTC and no TURN relay is configured.
  useEffect(() => {
    if (phase !== "connecting") {
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
      return;
    }
    connectionTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current || pcRef.current?.connectionState === "connected") return;
      toast.error(relayConfig?.relayConfigured
        ? "The call could not establish media. Please try again."
        : "The call could not connect on this network. A TURN relay is required for reliable calls.");
      cleanup();
      onClose();
    }, 25_000);
    return () => {
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    };
  }, [phase, relayConfig?.relayConfigured, onClose]);

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
    const iceServers = relayConfig?.iceServers?.length ? relayConfig.iceServers : ICE_SERVERS;
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        getSocket()?.emit("call:ice", { to: peerId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? remoteStreamRef.current ?? new MediaStream();
      if (!e.streams[0] && !stream.getTracks().some((track) => track.id === e.track.id)) {
        stream.addTrack(e.track);
      }
      remoteStreamRef.current = stream;
      attachRemoteMedia();
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        if (isMountedRef.current) setPhase("connected");
      } else if (pc.connectionState === "failed") {
        if (isMountedRef.current) {
          toast.error("The call could not connect. Please try again.");
          cleanup();
          onClose();
        }
      } else if (pc.connectionState === "disconnected") {
        // A brief connection change is normal on mobile networks. Only close
        // after a short grace period if the call has not recovered.
        window.setTimeout(() => {
          if (pc.connectionState === "disconnected" && isMountedRef.current) {
            toast.info("The call was disconnected.");
            cleanup();
            onClose();
          }
        }, 4000);
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
    if (relayConfigLoading) {
      toast.info("Preparing secure call connection. Please tap Accept again in a moment.");
      return;
    }
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
      await flushPendingIceCandidates(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      getSocket()?.emit("call:answer", { to: peerId, answer });
      // Wait for the actual WebRTC connection state before presenting this as
      // a connected call. This keeps status truthful when media is still joining.
      if (isMountedRef.current) setPhase("connecting");
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
    stopRingtone();
    pcRef.current?.close();
    pcRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    cameraVideoTrackRef.current = null;
    setIsScreenSharing(false);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    connectionTimeoutRef.current = null;
    pendingIceCandidatesRef.current = [];
    queuedIncomingCandidateKeysRef.current.clear();
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
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
      <audio ref={remoteAudioRef} autoPlay playsInline className="sr-only" />
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
            <p className="text-sm text-gray-400 uppercase tracking-widest" aria-live="assertive">
              Incoming {isVideo ? "Video" : "Voice"} Call · Ringing
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
                disabled={relayConfigLoading}
                className="flex flex-col items-center gap-2 group disabled:opacity-60"
                title={relayConfigLoading ? "Preparing secure call connection" : "Accept call"}
              >
                <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center group-hover:bg-green-700 transition-colors">
                  <Phone className="w-7 h-7" />
                </div>
                <span className="text-xs text-gray-400">Accept</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Calling / connecting ── */}
        {(phase === "calling" || phase === "connecting") && (
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
            <p className="text-gray-300 animate-pulse" aria-live="polite">
              {phase === "calling" ? `Ringing… Waiting for ${peerName} to answer` : "Connecting audio and video…"}
            </p>
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
                {/* Remote sound is handled by the dedicated audio element above. */}
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
