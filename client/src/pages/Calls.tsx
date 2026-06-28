import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneIncoming,
  PhoneCall,
  PhoneMissed,
  Users,
  History,
} from "lucide-react";
import { toast } from "sonner";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type CallState =
  | { type: "idle" }
  | { type: "calling"; peerId: number; peerName: string; isVideo: boolean }
  | { type: "incoming"; peerId: number; peerName: string; isVideo: boolean; offer: RTCSessionDescriptionInit }
  | { type: "connected"; peerId: number; peerName: string; isVideo: boolean };

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default function Calls() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"friends" | "history">("friends");
  const [callState, setCallState] = useState<CallState>({ type: "idle" });
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const callStartRef = useRef<number | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<any>(null);

  const utils = trpc.useUtils();
  const { data: friends = [] } = trpc.friends.list.useQuery();
  const { data: historyData } = trpc.callHistory.list.useQuery(
    { limit: 30 },
    { enabled: activeTab === "history" }
  );
  const markSeenMutation = trpc.callHistory.markSeen.useMutation({
    onSuccess: () => utils.callHistory.missedCount.invalidate(),
  });
  const logCallMutation = trpc.callHistory.log.useMutation({
    onSuccess: () => utils.callHistory.list.invalidate(),
  });

  // Mark calls as seen when the history tab is opened
  useEffect(() => {
    if (activeTab === "history" && user) {
      markSeenMutation.mutate();
    }
  }, [activeTab, user]);

  const logCall = useCallback(
    (peerId: number, type: "voice" | "video", status: "missed" | "answered" | "declined", duration = 0) => {
      if (!peerId) return;
      logCallMutation.mutate({
        calleeId: peerId,
        type,
        status,
        duration,
        startedAt: callStartRef.current ?? Date.now(),
        endedAt: Date.now(),
      });
    },
    [logCallMutation]
  );

  // Duration timer
  useEffect(() => {
    if (callState.type === "connected") {
      callStartRef.current = Date.now();
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((d) => {
          // AUTO-STOP AFTER 30 MINUTES (1800 seconds)
          if (d >= 1800) {
            toast.warning("Call duration limit (30 minutes) reached. Ending call.");
            setTimeout(() => hangUp(), 500);
            return d;
          }
          return d + 1;
        });
      }, 1000);
    } else {
      if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
    }
    return () => { if (durationTimerRef.current) clearInterval(durationTimerRef.current); };
  }, [callState.type]);

  // Auto-stop live stream after 30 minutes
  useEffect(() => {
    if (callState.type === "connected" && callDuration >= 1800) {
      hangUp();
    }
  }, [callDuration, callState.type]);


  // Cleanup on unmount
  useEffect(() => {
    return () => { hangUp(); };
  }, []);

  // Socket.IO signalling
  useEffect(() => {
    if (!user) return;
    import("socket.io-client").then(({ io }) => {
      const socket = io(window.location.origin, {
        path: "/api/socket.io",
        query: { userId: user.id },
      });
      socketRef.current = socket;

      socket.on("call:offer", async ({ from, fromName, offer, isVideo }: any) => {
        setCallState({ type: "incoming", peerId: from, peerName: fromName, isVideo, offer });
        toast.info(`Incoming ${isVideo ? "video" : "audio"} call from ${fromName}`);
      });

      socket.on("call:answer", async ({ answer }: any) => {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      socket.on("call:ice", async ({ candidate }: any) => {
        if (pcRef.current && candidate) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

      socket.on("call:hangup", () => {
        toast.info("Call ended by the other person.");
        hangUp();
      });

      return () => { socket.disconnect(); };
    }).catch(() => {});
  }, [user]);

  function createPeerConnection(peerId: number) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit("call:ice", { to: peerId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        hangUp();
      }
    };

    return pc;
  }

  async function startCall(peerId: number, peerName: string, isVideo: boolean) {
    if (!socketRef.current) {
      toast.error("Real-time connection not available. Please refresh the page.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection(peerId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current.emit("call:offer", {
        to: peerId,
        from: user!.id,
        fromName: user!.name,
        offer,
        isVideo,
      });

      setCallState({ type: "calling", peerId, peerName, isVideo });
    } catch (err: any) {
      toast.error("Could not access camera/microphone: " + err.message);
    }
  }

  async function acceptCall() {
    if (callState.type !== "incoming") return;
    const { peerId, peerName, isVideo, offer } = callState;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection(peerId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current?.emit("call:answer", { to: peerId, answer });
      setCallState({ type: "connected", peerId, peerName, isVideo });
    } catch (err: any) {
      toast.error("Could not accept call: " + err.message);
    }
  }

  function declineCall() {
    if (callState.type !== "incoming") return;
    socketRef.current?.emit("call:hangup", { to: callState.peerId });
    setCallState({ type: "idle" });
  }

  function hangUp() {
    if (callState.type !== "idle") {
      socketRef.current?.emit("call:hangup", { to: (callState as any).peerId });
    }
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState({ type: "idle" });
    setMicOn(true);
    setCamOn(true);
  }

  function toggleMic() {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setMicOn((v) => !v);
  }

  function toggleCam() {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setCamOn((v) => !v);
  }

  const isInCall = callState.type === "connected" || callState.type === "calling";
  const showVideo = isInCall && (callState as any).isVideo;
  const historyRows = historyData?.rows ?? [];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <PhoneCall className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-bold">Calls</h1>
      </div>

      {/* Incoming call banner */}
      {callState.type === "incoming" && (
        <div className="mb-6 p-5 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
            <PhoneIncoming className="w-6 h-6 text-green-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">{callState.peerName}</p>
            <p className="text-sm text-muted-foreground">
              Incoming {callState.isVideo ? "video" : "audio"} call...
            </p>
          </div>
          <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={acceptCall}>
            <Phone className="w-4 h-4 mr-2" /> Answer
          </Button>
          <Button variant="destructive" onClick={declineCall}>
            <PhoneOff className="w-4 h-4 mr-2" /> Decline
          </Button>
        </div>
      )}

      {/* Active call view */}
      {isInCall && (
        <div className="mb-6 rounded-2xl overflow-hidden bg-card border border-border">
          {/* Duration badge */}
          <div className="px-4 py-2 flex items-center justify-between bg-muted/40">
            <span className="text-sm font-medium">{(callState as any).peerName}</span>
            <span className="text-xs text-muted-foreground font-mono">
              {callState.type === "calling" ? "Calling…" : formatDuration(callDuration)}
            </span>
          </div>

          {showVideo ? (
            <div className="relative bg-black aspect-video">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <video ref={localVideoRef} autoPlay playsInline muted
                className="absolute bottom-4 right-4 w-32 h-24 rounded-xl object-cover border-2 border-white/30" />
            </div>
          ) : (
            <div className="bg-muted/30 flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <p className="text-lg font-semibold">{(callState as any).peerName}</p>
              <p className="text-sm text-muted-foreground">
                {callState.type === "calling" ? "Calling…" : "Audio call in progress"}
              </p>
              <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
              <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
            </div>
          )}

          {/* Call controls */}
          <div className="flex items-center justify-center gap-4 p-4 bg-card">
            <Button variant={micOn ? "outline" : "destructive"} size="icon" className="w-12 h-12 rounded-full" onClick={toggleMic}>
              {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>
            {showVideo && (
              <Button variant={camOn ? "outline" : "destructive"} size="icon" className="w-12 h-12 rounded-full" onClick={toggleCam}>
                {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>
            )}
            <Button variant="destructive" size="icon" className="w-14 h-14 rounded-full" onClick={hangUp}>
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-muted/40 rounded-xl p-1 w-fit">
        <button
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "friends" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("friends")}
        >
          <Users className="w-4 h-4" /> Friends
        </button>
        <button
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "history" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("history")}
        >
          <History className="w-4 h-4" /> History
        </button>
      </div>

      {/* Friends tab */}
      {activeTab === "friends" && (
        <>
          {friends.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Add friends first to start a call.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => {
                const otherId = f.userId1 === user?.id ? f.userId2 : f.userId1;
                return (
                  <FriendCallRow
                    key={f.id}
                    userId={otherId}
                    disabled={callState.type !== "idle"}
                    onAudioCall={(name) => startCall(otherId, name, false)}
                    onVideoCall={(name) => startCall(otherId, name, true)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* History tab */}
      {activeTab === "history" && (
        <>
          {historyRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No call history yet.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-2 pr-2">
                {historyRows.map((row: { id: number; callerId: number; calleeId: number; type: string; status: string; startedAt: Date; endedAt: Date | null; duration: number; peerName: string | null; peerAvatar: string | null; peerId: number }) => {
                  const isMissed = row.status === "missed";
                  const isOutgoing = row.callerId === user?.id;
                  const peerId = row.peerId;
                  const peerName = row.peerName ?? "Unknown";
                  const peerAvatar = row.peerAvatar;

                  return (
                    <div
                      key={row.id}
                      className={`flex items-center gap-4 p-3 rounded-xl border bg-card transition-colors ${
                        isMissed ? "border-red-500/30 bg-red-500/5" : "border-border hover:bg-muted/30"
                      }`}
                    >
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage src={peerAvatar ?? undefined} />
                        <AvatarFallback>{getInitials(peerName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{peerName}</p>
                          {row.type === "video" ? (
                            <Video className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {isMissed ? (
                            <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                              <PhoneMissed className="w-3 h-3" /> Missed
                            </span>
                          ) : (
                            <span className={`text-xs font-medium ${isOutgoing ? "text-blue-500" : "text-green-500"}`}>
                              {isOutgoing ? "Outgoing" : "Incoming"}
                            </span>
                          )}
                          {row.duration > 0 && (
                            <span className="text-xs text-muted-foreground">· {formatDuration(row.duration)}</span>
                          )}
                          <span className="text-xs text-muted-foreground">· {formatRelativeTime(row.startedAt)}</span>
                        </div>
                      </div>
                      {/* Call-back buttons */}
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-8 h-8 rounded-full"
                          disabled={callState.type !== "idle"}
                          title="Call back (voice)"
                          onClick={() => startCall(peerId, peerName, false)}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-8 h-8 rounded-full"
                          disabled={callState.type !== "idle"}
                          title="Call back (video)"
                          onClick={() => startCall(peerId, peerName, true)}
                        >
                          <Video className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </>
      )}
    </div>
  );
}

function FriendCallRow({
  userId,
  disabled,
  onAudioCall,
  onVideoCall,
}: {
  userId: number;
  disabled: boolean;
  onAudioCall: (name: string) => void;
  onVideoCall: (name: string) => void;
}) {
  const { data: profileData } = trpc.users.getProfile.useQuery({ userId });
  const u = profileData?.user;
  if (!u) return null;

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
      <Avatar className="w-10 h-10">
        <AvatarImage src={u.avatar ?? undefined} />
        <AvatarFallback>{getInitials(u.name ?? "?")}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate text-sm">{u.name}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={disabled} onClick={() => onAudioCall(u.name ?? "")} title="Audio call">
          <Phone className="w-4 h-4 mr-1" /> Call
        </Button>
        <Button variant="outline" size="sm" disabled={disabled} onClick={() => onVideoCall(u.name ?? "")} title="Video call">
          <Video className="w-4 h-4 mr-1" /> Video
        </Button>
      </div>
    </div>
  );
}
