import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, Users, Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── WebRTC peer connection management ───────────────────────────────────────

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface RemoteStream {
  userId: number;
  name: string;
  avatar: string | null;
  stream: MediaStream | null;
  audioMuted: boolean;
  videoMuted: boolean;
}

export default function GroupCall() {
  const { roomId: roomIdStr } = useParams<{ roomId: string }>();
  const roomId = parseInt(roomIdStr ?? "0", 10);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // Local state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [remoteStreams, setRemoteStreams] = useState<Map<number, RemoteStream>>(new Map());
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [fullscreenUserId, setFullscreenUserId] = useState<number | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnections = useRef<Map<number, RTCPeerConnection>>(new Map());
  const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Queries
  const { data: roomData, isLoading } = trpc.calls.getRoom.useQuery(
    { roomId },
    { enabled: !!roomId && isJoined, refetchInterval: 5000 }
  );

  // Mutations
  const joinMutation = trpc.calls.join.useMutation();
  const leaveMutation = trpc.calls.leave.useMutation();
  const sendSignalMutation = trpc.calls.sendSignal.useMutation();

  // Signal polling
  const { data: signalData } = trpc.calls.pollSignals.useQuery(
    { roomId },
    { enabled: !!roomId && isJoined, refetchInterval: 1000 }
  );

  // ── Process incoming signals ──────────────────────────────────────────────
  useEffect(() => {
    if (!signalData?.signals || !user) return;
    for (const signal of signalData.signals) {
      handleIncomingSignal(signal.fromUserId, signal.type, JSON.parse(signal.payload));
    }
  }, [signalData]);

  // ── Handle participant changes ────────────────────────────────────────────
  useEffect(() => {
    if (!roomData?.participants || !user || !isJoined) return;
    const currentParticipants = roomData.participants;
    const currentIds = new Set(currentParticipants.map(p => p.userId));

    // Remove disconnected participants
    setRemoteStreams(prev => {
      const next = new Map(prev);
      Array.from(next.keys()).forEach(uid => {
        if (!currentIds.has(uid) && uid !== user.id) {
          next.delete(uid);
          const pc = peerConnections.current.get(uid);
          if (pc) { pc.close(); peerConnections.current.delete(uid); }
        }
      });
      return next;
    });

    // Initiate connections to new participants
    for (const p of currentParticipants) {
      if (p.userId === user.id) continue;
      if (!peerConnections.current.has(p.userId)) {
        // We initiate if our ID is smaller (prevents duplicate offers)
        if (user.id < p.userId) {
          initiateCall(p.userId, p.user);
        } else {
          // Register remote stream slot so they can see us
          setRemoteStreams(prev => {
            if (prev.has(p.userId)) return prev;
            const next = new Map(prev);
            next.set(p.userId, {
              userId: p.userId,
              name: p.user.name ?? "User",
              avatar: p.user.avatar ?? null,
              stream: null,
              audioMuted: false,
              videoMuted: false,
            });
            return next;
          });
        }
      }
    }
  }, [roomData?.participants, isJoined]);

  // ── Create peer connection ────────────────────────────────────────────────
  const createPeerConnection = useCallback((remoteUserId: number, remoteUser: { name: string | null; avatar: string | null }) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        pc.addTrack(track, localStreamRef.current);
      }
    }

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalMutation.mutate({
          roomId,
          toUserId: remoteUserId,
          type: "ice-candidate",
          payload: JSON.stringify(event.candidate),
        });
      }
    };

    // Remote stream
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStreams(prev => {
        const next = new Map(prev);
        const existing = next.get(remoteUserId);
        next.set(remoteUserId, {
          userId: remoteUserId,
          name: existing?.name ?? remoteUser.name ?? "User",
          avatar: existing?.avatar ?? remoteUser.avatar ?? null,
          stream,
          audioMuted: existing?.audioMuted ?? false,
          videoMuted: existing?.videoMuted ?? false,
        });
        return next;
      });
    };

    peerConnections.current.set(remoteUserId, pc);
    return pc;
  }, [roomId, sendSignalMutation]);

  // ── Initiate call to a peer ───────────────────────────────────────────────
  const initiateCall = useCallback(async (remoteUserId: number, remoteUser: { name: string | null; avatar: string | null }) => {
    const pc = createPeerConnection(remoteUserId, remoteUser);
    setRemoteStreams(prev => {
      const next = new Map(prev);
      if (!next.has(remoteUserId)) {
        next.set(remoteUserId, { userId: remoteUserId, name: remoteUser.name ?? "User", avatar: remoteUser.avatar ?? null, stream: null, audioMuted: false, videoMuted: false });
      }
      return next;
    });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignalMutation.mutate({
      roomId,
      toUserId: remoteUserId,
      type: "offer",
      payload: JSON.stringify(offer),
    });
  }, [createPeerConnection, roomId, sendSignalMutation]);

  // ── Handle incoming signal ────────────────────────────────────────────────
  const handleIncomingSignal = useCallback(async (fromUserId: number, type: string, payload: unknown) => {
    if (!user) return;
    let pc = peerConnections.current.get(fromUserId);

    if (type === "offer") {
      if (!pc) {
        // Find participant info
        const participant = roomData?.participants.find(p => p.userId === fromUserId);
        pc = createPeerConnection(fromUserId, { name: participant?.user.name ?? "User", avatar: participant?.user.avatar ?? null });
      }
      await pc.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignalMutation.mutate({
        roomId,
        toUserId: fromUserId,
        type: "answer",
        payload: JSON.stringify(answer),
      });
    } else if (type === "answer" && pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
    } else if (type === "ice-candidate" && pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload as RTCIceCandidateInit));
      } catch {
        // ignore stale candidates
      }
    }
  }, [user, roomData, createPeerConnection, roomId, sendSignalMutation]);

  // ── Join the call ─────────────────────────────────────────────────────────
  const joinCall = useCallback(async () => {
    setIsConnecting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      await joinMutation.mutateAsync({ roomId });
      setIsJoined(true);
    } catch (err) {
      toast.error("Could not access camera/microphone. Please check permissions.");
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  }, [roomId, joinMutation]);

  // ── Leave the call ────────────────────────────────────────────────────────
  const leaveCall = useCallback(async () => {
    // Stop local tracks
    localStream?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    // Close all peer connections
    Array.from(peerConnections.current.values()).forEach(pc => pc.close());
    peerConnections.current.clear();
    // Notify server
    await leaveMutation.mutateAsync({ roomId });
    navigate("/groups");
  }, [localStream, roomId, leaveMutation, navigate]);

  // ── Toggle audio ──────────────────────────────────────────────────────────
  const toggleAudio = () => {
    if (!localStream) return;
    const enabled = !audioEnabled;
    localStream.getAudioTracks().forEach(t => { t.enabled = enabled; });
    setAudioEnabled(enabled);
  };

  // ── Toggle video ──────────────────────────────────────────────────────────
  const toggleVideo = () => {
    if (!localStream) return;
    const enabled = !videoEnabled;
    localStream.getVideoTracks().forEach(t => { t.enabled = enabled; });
    setVideoEnabled(enabled);
  };

  // ── Screen share ──────────────────────────────────────────────────────────
  const toggleScreenShare = async () => {
    if (!localStream) return;
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        Array.from(peerConnections.current.values()).forEach(pc => {
          const sender = pc.getSenders().find((s: RTCRtpSender) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        });
        screenTrack.onended = () => setScreenSharing(false);
        setScreenSharing(true);
      } catch {
        toast.error("Screen sharing not available.");
      }
    } else {
      const camTrack = localStream.getVideoTracks()[0];
      Array.from(peerConnections.current.values()).forEach(pc => {
        const sender = pc.getSenders().find((s: RTCRtpSender) => s.track?.kind === "video");
        if (sender && camTrack) sender.replaceTrack(camTrack);
      });
      setScreenSharing(false);
    }
  };

  // ── Set local video ref ───────────────────────────────────────────────────
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      Array.from(peerConnections.current.values()).forEach(pc => pc.close());
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, []);

  // ─── Pre-join screen ──────────────────────────────────────────────────────
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border rounded-2xl p-8 text-center space-y-6 shadow-lg">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Video className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Group Call</h1>
            <p className="text-muted-foreground text-sm mt-1">Room #{roomId}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Your camera and microphone will be requested when you join.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/groups")}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={joinCall} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Join Call"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active call screen ───────────────────────────────────────────────────
  const allParticipants = [
    // Local user tile
    { userId: user?.id ?? 0, name: user?.name ?? "You", avatar: null, stream: localStream, isLocal: true },
    // Remote participants
    ...Array.from(remoteStreams.values()).map(r => ({ ...r, isLocal: false })),
  ];

  const focusedParticipant = fullscreenUserId !== null
    ? allParticipants.find(p => p.userId === fullscreenUserId)
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-white text-sm font-medium">Live Call</span>
          <Badge variant="secondary" className="text-xs">{allParticipants.length} participants</Badge>
        </div>
        <div className="flex items-center gap-2">
          {fullscreenUserId !== null && (
            <Button variant="ghost" size="sm" className="text-white" onClick={() => setFullscreenUserId(null)}>
              <Maximize2 className="w-4 h-4 mr-1" /> Exit Focus
            </Button>
          )}
        </div>
      </div>

      {/* Video grid */}
      <div className="flex-1 p-4 overflow-auto">
        {focusedParticipant ? (
          // Focused view
          <div className="flex flex-col gap-3 h-full">
            <VideoTile participant={focusedParticipant} large />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allParticipants.filter(p => p.userId !== fullscreenUserId).map(p => (
                <VideoTile key={p.userId} participant={p} small onClick={() => setFullscreenUserId(p.userId)} />
              ))}
            </div>
          </div>
        ) : (
          // Grid view
          <div className={cn(
            "grid gap-3 h-full",
            allParticipants.length === 1 ? "grid-cols-1" :
            allParticipants.length === 2 ? "grid-cols-2" :
            allParticipants.length <= 4 ? "grid-cols-2" :
            allParticipants.length <= 6 ? "grid-cols-3" : "grid-cols-4"
          )}>
            {allParticipants.map(p => (
              <VideoTile
                key={p.userId}
                participant={p}
                onClick={() => setFullscreenUserId(p.userId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-5 bg-zinc-900/80 backdrop-blur">
        <ControlButton
          active={audioEnabled}
          activeIcon={<Mic className="w-5 h-5" />}
          inactiveIcon={<MicOff className="w-5 h-5" />}
          activeLabel="Mute"
          inactiveLabel="Unmute"
          onClick={toggleAudio}
        />
        <ControlButton
          active={videoEnabled}
          activeIcon={<Video className="w-5 h-5" />}
          inactiveIcon={<VideoOff className="w-5 h-5" />}
          activeLabel="Stop Video"
          inactiveLabel="Start Video"
          onClick={toggleVideo}
        />
        <ControlButton
          active={!screenSharing}
          activeIcon={<Monitor className="w-5 h-5" />}
          inactiveIcon={<Monitor className="w-5 h-5" />}
          activeLabel="Share Screen"
          inactiveLabel="Stop Share"
          onClick={toggleScreenShare}
          variant="secondary"
        />
        <button
          className="flex flex-col items-center gap-1 group"
          onClick={leaveCall}
        >
          <div className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors">
            <PhoneOff className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs text-zinc-400">Leave</span>
        </button>
      </div>
    </div>
  );
}

// ─── Video Tile Component ─────────────────────────────────────────────────────

function VideoTile({
  participant,
  large,
  small,
  onClick,
}: {
  participant: { userId: number; name: string; avatar: string | null; stream: MediaStream | null; isLocal: boolean };
  large?: boolean;
  small?: boolean;
  onClick?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const hasVideo = participant.stream && participant.stream.getVideoTracks().some(t => t.enabled && t.readyState === "live");

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center cursor-pointer group",
        large ? "flex-1 min-h-[300px]" : small ? "w-32 h-24 shrink-0" : "aspect-video"
      )}
      onClick={onClick}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Avatar className={cn(large ? "w-20 h-20" : "w-10 h-10")}>
            <AvatarImage src={participant.avatar ?? undefined} />
            <AvatarFallback className={cn("font-bold", large ? "text-2xl" : "text-sm")}>
              {getInitials(participant.name)}
            </AvatarFallback>
          </Avatar>
          {!small && <span className="text-white text-sm">{participant.name}</span>}
        </div>
      )}
      {/* Name overlay */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="text-white text-xs bg-black/50 rounded px-1.5 py-0.5 truncate max-w-[80%]">
          {participant.isLocal ? `${participant.name} (You)` : participant.name}
        </span>
      </div>
      {/* Hover overlay */}
      {onClick && (
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Maximize2 className="w-6 h-6 text-white" />
        </div>
      )}
    </div>
  );
}

// ─── Control Button ───────────────────────────────────────────────────────────

function ControlButton({
  active,
  activeIcon,
  inactiveIcon,
  activeLabel,
  inactiveLabel,
  onClick,
  variant = "default",
}: {
  active: boolean;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  activeLabel: string;
  inactiveLabel: string;
  onClick: () => void;
  variant?: "default" | "secondary";
}) {
  return (
    <button className="flex flex-col items-center gap-1 group" onClick={onClick}>
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
        active
          ? variant === "secondary" ? "bg-zinc-700 hover:bg-zinc-600" : "bg-zinc-700 hover:bg-zinc-600"
          : "bg-red-600/20 hover:bg-red-600/30"
      )}>
        <span className={cn(active ? "text-white" : "text-red-400")}>
          {active ? activeIcon : inactiveIcon}
        </span>
      </div>
      <span className="text-xs text-zinc-400">{active ? activeLabel : inactiveLabel}</span>
    </button>
  );
}
