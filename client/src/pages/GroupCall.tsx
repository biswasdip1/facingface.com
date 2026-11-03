import { useState, useEffect, useRef, type ReactNode } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, Users, Copy,
  ArrowLeft, Loader2, Volume2, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  GROUP_CALL_LIMIT, GroupCallMedia, groupMediaConstraints, groupMediaError,
  stopGroupStream, type GroupPeerView,
} from "@/lib/groupCallMedia";

type JoinAttempt = {
  roomId: number;
  cancelled: boolean;
  joinSent: boolean;
  joinSettled: boolean;
  leavePromise?: Promise<void>;
  stream: MediaStream | null;
  media: GroupCallMedia | null;
};
type TileParticipant = GroupPeerView & { isLocal: boolean };

function initials(name: string) {
  return name.trim().split(/\s+/).map(part => part[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

export default function GroupCall() {
  const { roomId: rawRoomId } = useParams<{ roomId: string }>();
  const roomId = Number(rawRoomId);
  const validRoomId = Number.isInteger(roomId) && roomId > 0;
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const joinMutation = trpc.calls.join.useMutation();
  const leaveMutation = trpc.calls.leave.useMutation();
  const sendSignalMutation = trpc.calls.sendSignal.useMutation();

  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<GroupPeerView[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [relayWarning, setRelayWarning] = useState(false);
  const [pollWarning, setPollWarning] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);

  const mounted = useRef(false);
  const currentRoomId = useRef(roomId);
  currentRoomId.current = roomId;
  const pendingJoin = useRef<JoinAttempt | null>(null);
  const activeAttempt = useRef<JoinAttempt | null>(null);
  const mediaRef = useRef<GroupCallMedia | null>(null);
  const audioElements = useRef(new Map<number, HTMLAudioElement>());
  // Do not make media effects depend on mutation/query object identity. Polls
  // update these refs, not the lifetime of a running RTCPeerConnection.
  const api = useRef({
    join: joinMutation.mutateAsync,
    leave: leaveMutation.mutateAsync,
    sendSignal: sendSignalMutation.mutateAsync,
    getRoom: utils.calls.getRoom.fetch,
    pollSignals: utils.calls.pollSignals.fetch,
    iceServers: utils.calls.iceServers.fetch,
  });
  api.current = {
    join: joinMutation.mutateAsync,
    leave: leaveMutation.mutateAsync,
    sendSignal: sendSignalMutation.mutateAsync,
    getRoom: utils.calls.getRoom.fetch,
    pollSignals: utils.calls.pollSignals.fetch,
    iceServers: utils.calls.iceServers.fetch,
  };

  // Metadata is authorized for group members before Join. No media request is
  // made from this query or from any effect.
  const roomQuery = trpc.calls.getRoom.useQuery(
    { roomId },
    { enabled: validRoomId && !!user, refetchInterval: 4000, retry: false, refetchOnWindowFocus: true }
  );
  const roomData = roomQuery.data;
  const roomDataRef = useRef(roomData);
  roomDataRef.current = roomData;
  const audioOnly = roomData?.room.type === "audio";
  const roomEnded = roomData?.room.status === "ended";
  const groupId = roomData?.room.groupId;
  const returnUrl = groupId ? `/messages?tab=groups&group=${groupId}` : "/messages?tab=groups";
  const otherCount = roomData?.participants.filter(p => p.userId !== user?.id).length ?? 0;
  const isFull = otherCount >= GROUP_CALL_LIMIT;

  function isCurrent(attempt: JoinAttempt): boolean {
    return mounted.current && !attempt.cancelled && currentRoomId.current === attempt.roomId && activeAttempt.current === attempt;
  }

  async function notifyLeave(attempt: JoinAttempt): Promise<void> {
    // Never race leave ahead of an in-flight join: its late success would
    // otherwise leave a ghost participant behind after Cancel/unmount.
    if (!attempt.joinSent || !attempt.joinSettled) return;
    if (!attempt.leavePromise) {
      attempt.leavePromise = api.current.leave({ roomId: attempt.roomId }).then(() => {}, () => {});
    }
    await attempt.leavePromise;
  }

  function dispose(attempt: JoinAttempt | null): void {
    if (!attempt) return;
    attempt.cancelled = true;
    attempt.media?.close();
    stopGroupStream(attempt.stream);
    attempt.stream = null;
    if (mediaRef.current === attempt.media) mediaRef.current = null;
    if (activeAttempt.current === attempt) activeAttempt.current = null;
    void notifyLeave(attempt);
  }

  function clearCall(): void {
    dispose(activeAttempt.current);
    dispose(pendingJoin.current);
    setJoined(false);
    setPreview(null);
    setPeers([]);
    setSharing(false);
    setShareBusy(false);
    setSoundBlocked(false);
    setPollWarning(false);
    setRelayWarning(false);
  }

  useEffect(() => {
    mounted.current = true;
    setJoined(false);
    setPreview(null);
    setPeers([]);
    setSharing(false);
    setShareBusy(false);
    setError(null);
    setSoundBlocked(false);
    setPollWarning(false);
    setRelayWarning(false);
    setJoining(!!pendingJoin.current);
    return () => {
      mounted.current = false;
      const active = activeAttempt.current;
      const pending = pendingJoin.current;
      if (active?.roomId === roomId) dispose(active);
      if (pending?.roomId === roomId) dispose(pending);
    };
    // Lifetime is the route only, not room metadata or tRPC hook objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!joined || !media || !roomData) return;
    if (roomData.room.status === "ended") {
      clearCall();
      setError("This call has ended. You can return to your group chat.");
      return;
    }
    void media.syncParticipants(roomData.participants).catch(() => {
      if (mediaRef.current === media && mounted.current) setPollWarning(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, roomData]);

  useEffect(() => {
    if (!joined) return;
    const media = mediaRef.current;
    const attempt = activeAttempt.current;
    if (!media || !attempt) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (cancelled || !isCurrent(attempt) || mediaRef.current !== media) return;
      try {
        const batch = await api.current.pollSignals({ roomId: attempt.roomId }, { staleTime: 0 });
        if (cancelled || !isCurrent(attempt) || mediaRef.current !== media) return;
        await media.processSignals(batch.signals);
        if (!cancelled && isCurrent(attempt)) setPollWarning(false);
      } catch (cause) {
        if (!cancelled && isCurrent(attempt)) {
          const code = (cause as { data?: { code?: string } })?.data?.code;
          if (code === "FORBIDDEN" || code === "NOT_FOUND" || code === "UNAUTHORIZED") {
            clearCall();
            setError("This call is no longer available to you. Return to your group chat.");
            return;
          }
          setPollWarning(true);
        }
      } finally {
        // Recursive timeout: no overlapping polls or signal-processing batches.
        if (!cancelled && isCurrent(attempt) && mediaRef.current === media)
          timer = setTimeout(poll, 900);
      }
    };
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, roomId]);

  async function joinCall(): Promise<void> {
    if (pendingJoin.current || mediaRef.current || !user || !roomData || roomEnded || !validRoomId) return;
    const attempt: JoinAttempt = {
      roomId, cancelled: false, joinSent: false, joinSettled: false, stream: null, media: null,
    };
    pendingJoin.current = attempt; // Synchronous lock prevents double clicks.
    activeAttempt.current = attempt;
    setJoining(true);
    setError(null);
    setAudioEnabled(true);
    setVideoEnabled(!audioOnly);
    let stage: "room" | "ice" | "media" | "join" = "room";
    let completed = false;
    let callType: "audio" | "video" = audioOnly ? "audio" : "video";
    try {
      const freshRoom = await api.current.getRoom({ roomId: attempt.roomId }, { staleTime: 0 });
      if (!isCurrent(attempt)) return;
      if (freshRoom.room.status === "ended") throw new Error("This call has ended. Return to your group chat.");
      if (freshRoom.participants.filter(p => p.userId !== user.id).length >= GROUP_CALL_LIMIT)
        throw new Error("This call is full. Up to four people can join, including you.");
      callType = freshRoom.room.type;
      stage = "ice";
      const relay = await api.current.iceServers(undefined, { staleTime: 0 });
      if (!isCurrent(attempt)) return;
      if (!relay.iceServers.length) throw new Error("Call connection settings are unavailable. Please try joining again.");
      stage = "media";
      if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined")
        throw new Error("Calling isn't supported here. Open FacingFace in a current browser over a secure connection.");
      const stream = await navigator.mediaDevices.getUserMedia(groupMediaConstraints(callType));
      attempt.stream = stream;
      if (!isCurrent(attempt)) { stopGroupStream(stream); return; }
      stage = "join";
      attempt.joinSent = true;
      try { await api.current.join({ roomId: attempt.roomId }); }
      finally { attempt.joinSettled = true; }
      if (!isCurrent(attempt)) return;
      const media = new GroupCallMedia({
        userId: user.id, stream, iceServers: relay.iceServers,
        sendSignal: (toUserId, type, payload) => api.current.sendSignal({ roomId: attempt.roomId, toUserId, type, payload }),
        onPeers: next => { if (isCurrent(attempt)) setPeers(next); },
        onPreview: (next, isSharing) => {
          if (isCurrent(attempt)) { setPreview(next); setSharing(isSharing); }
        },
      });
      attempt.media = media;
      mediaRef.current = media;
      setPreview(stream);
      setRelayWarning(!relay.relayConfigured);
      setVideoEnabled(callType === "video");
      setJoined(true);
      completed = true;
      // A new poll refreshes this snapshot; establish known peer slots now.
      void media.syncParticipants(freshRoom.participants).catch(() => {
        if (isCurrent(attempt)) setPollWarning(true);
      });
      void utils.calls.getRoom.invalidate({ roomId: attempt.roomId });
    } catch (cause) {
      if (isCurrent(attempt)) {
        setError(stage === "media" ? groupMediaError(cause, callType) :
          cause instanceof Error ? cause.message : "Could not join this call. Please try again.");
      }
    } finally {
      if (!completed) {
        dispose(attempt);
        await notifyLeave(attempt);
      }
      if (pendingJoin.current === attempt) pendingJoin.current = null;
      if (mounted.current && currentRoomId.current === attempt.roomId) setJoining(false);
    }
  }

  async function leaveCall(goBack = true): Promise<void> {
    const attempt = activeAttempt.current ?? pendingJoin.current;
    clearCall(); // Release hardware immediately, before any network work.
    if (attempt?.joinSettled) await notifyLeave(attempt);
    else if (!attempt && roomDataRef.current?.participants.some(p => p.userId === user?.id)) {
      // The creator may already occupy a server seat without having used media.
      await api.current.leave({ roomId }).catch(() => {});
    }
    if (goBack && mounted.current) navigate(returnUrl);
    else if (mounted.current) {
      setError(null);
      void utils.calls.getRoom.invalidate({ roomId });
    }
  }

  function toggleAudio(): void {
    const next = !audioEnabled;
    mediaRef.current?.setAudioEnabled(next);
    setAudioEnabled(next);
  }
  function toggleVideo(): void {
    const next = !videoEnabled;
    mediaRef.current?.setVideoEnabled(next);
    setVideoEnabled(next);
  }
  async function toggleShare(): Promise<void> {
    const media = mediaRef.current;
    if (!media || shareBusy) return;
    setShareBusy(true);
    try {
      if (media.sharing) await media.stopScreenShare();
      else await media.startScreenShare();
    } catch (cause) {
      if (mediaRef.current === media && mounted.current)
        toast.error(cause instanceof Error ? cause.message : "Screen sharing is unavailable. Try again.");
    } finally {
      if (mediaRef.current === media && mounted.current) setShareBusy(false);
    }
  }
  async function copyInvite(): Promise<void> {
    const link = `${window.location.origin}/calls/group/${roomId}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Call link copied. Only members of this group can join.");
    } catch { toast.error("Couldn't copy the link. Copy this page's address from your browser instead."); }
  }
  async function enableSound(): Promise<void> {
    // All play calls happen in the click's activation stack, including on iOS.
    const results = await Promise.all(Array.from(audioElements.current.values()).map(element => {
      element.muted = false;
      return element.play().then(() => true, () => false);
    }));
    setSoundBlocked(results.some(result => !result));
  }
  function registerAudio(userId: number, element: HTMLAudioElement | null): void {
    if (element) audioElements.current.set(userId, element);
    else audioElements.current.delete(userId);
  }

  const participants: TileParticipant[] = [{
    userId: user?.id ?? 0,
    name: user?.name ?? "You",
    avatar: user?.avatar ?? null,
    stream: preview,
    status: audioEnabled ? (audioOnly ? "Microphone on" : sharing ? "Sharing screen" : videoEnabled ? "Camera and microphone on" : "Camera off") : "Microphone muted",
    needsRetry: false,
    isLocal: true,
  }, ...peers.slice(0, GROUP_CALL_LIMIT - 1).map(peer => ({ ...peer, isLocal: false }))];
  const supportsShare = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

  if (!joined) {
    const unavailable = !validRoomId || (!authLoading && !user) || !!roomQuery.error || roomEnded;
    const loading = authLoading || (!!user && roomQuery.isLoading);
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4" data-testid="group-call-prejoin">
        <section className="w-full max-w-lg rounded-2xl border bg-card p-6 sm:p-8 shadow-lg space-y-6" aria-labelledby="group-call-heading">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-primary/10 p-4 text-primary">{audioOnly ? <Mic className="h-7 w-7" /> : <Video className="h-7 w-7" />}</div>
            <div><h1 id="group-call-heading" className="text-2xl font-bold">Group {audioOnly ? "audio" : "video"} call</h1>
              <p className="text-sm text-muted-foreground">{validRoomId ? `Room #${roomId} · Up to 4 people` : "Invalid call link"}</p>
            </div>
          </div>
          {loading ? <p role="status" className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading call details…</p> :
            unavailable ? <p role="alert" className="text-sm text-muted-foreground">{roomEnded ? "This call has ended." : !user ? "Sign in to FacingFace to join this call." : roomQuery.error?.message ?? "This call link is not valid."}</p> : <>
              <p className="text-sm text-muted-foreground">{audioOnly ? "Only your microphone will be requested when you choose Join call. Your camera stays off." : "Your camera and microphone are requested only when you choose Join call."} Nothing is turned on automatically.</p>
              <div className="rounded-xl bg-muted/50 p-4 space-y-3">
                <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><Users className="h-4 w-4" /> In this room</span><span data-testid="group-call-prejoin-count">{roomData?.participants.length ?? 0} / 4</span></div>
                {roomData?.participants.length ? <div className="flex flex-wrap gap-2">{roomData.participants.slice(0, 4).map(participant => <span key={participant.userId} className="rounded-full border bg-background px-3 py-1 text-xs">{participant.user.name ?? "Group member"}{participant.userId === user?.id ? " (You)" : ""}</span>)}</div> : <p className="text-xs text-muted-foreground">Be the first to join.</p>}
              </div>
              <p className="text-xs text-muted-foreground">Only members of this group can open this link and join. Copying the link does not send an invitation or message.</p>
              {isFull && <p role="alert" className="text-sm text-destructive">This call is full. Four people can join, including you.</p>}
            </>}
          {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" data-testid="group-call-error">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { void leaveCall(); }} data-testid="group-call-cancel"><ArrowLeft className="h-4 w-4 mr-2" />{roomEnded ? "Back to group" : joining ? "Cancel joining" : "Back to group"}</Button>
            {!unavailable && <Button className="flex-1" onClick={() => { void joinCall(); }} disabled={joining || loading || isFull || !roomData} data-testid="group-call-join">{joining ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Joining…</> : "Join call"}</Button>}
          </div>
          {!unavailable && !loading && <Button variant="ghost" className="w-full" onClick={() => { void copyInvite(); }} data-testid="group-call-copy-invite"><Copy className="h-4 w-4 mr-2" /> Copy call link</Button>}
        </section>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-[80] h-[100dvh] min-h-0 overflow-y-auto bg-zinc-950 text-white flex flex-col" data-testid="group-call-active">
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6 bg-zinc-900/80 pt-[max(1rem,env(safe-area-inset-top))]">
        <div><h1 className="text-lg font-semibold">Group {audioOnly ? "audio" : "video"} call</h1><p className="text-xs text-zinc-400">Room #{roomId} · Only group members can join</p></div>
        <div className="flex items-center gap-3"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm" data-testid="group-call-participant-count"><Users className="h-4 w-4" />{participants.length} / 4</span><Button variant="ghost" size="sm" className="text-zinc-200 hover:bg-white/10 hover:text-white" onClick={() => { void copyInvite(); }} data-testid="group-call-copy-invite"><Copy className="h-4 w-4 mr-2" />Copy link</Button></div>
      </header>
      <div aria-live="polite" className="shrink-0 mx-auto w-full max-w-6xl px-4">
        {relayWarning && <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">A relay server is not currently configured. If someone cannot connect across networks, try rejoining or ask your administrator to check TURN settings.</p>}
        {(pollWarning || roomQuery.isError) && <p className="mt-3 rounded-lg bg-amber-400/10 p-3 text-sm text-amber-100">Connection to the call service was interrupted. Retrying… Your media stays on. <button className="underline font-medium" onClick={() => { void leaveCall(false); }} data-testid="group-call-rejoin">Leave and rejoin</button></p>}
        {soundBlocked && <Button className="mt-3" onClick={() => { void enableSound(); }} data-testid="group-call-enable-sound"><Volume2 className="h-4 w-4 mr-2" />Turn on sound</Button>}
      </div>
      <section className="flex-1 w-full max-w-6xl mx-auto p-3 sm:p-6" aria-label="Call participants">
        <div className="grid grid-cols-2 gap-3 sm:gap-4" data-testid="group-call-grid">
          {participants.map(participant => <VideoTile key={participant.userId} participant={participant} videoEnabled={participant.isLocal ? videoEnabled && !audioOnly : undefined} audioEnabled={participant.isLocal ? audioEnabled : undefined} registerAudio={registerAudio} onSoundBlocked={() => { if (mounted.current && joined) setSoundBlocked(true); }} onRetry={() => { void leaveCall(false); }} />)}
          {participants.length === 1 && <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-zinc-900/50 p-3 sm:p-6 text-center"><div><Users className="h-7 w-7 sm:h-9 sm:w-9 mx-auto text-zinc-500 mb-2" /><p className="text-xs sm:text-base font-medium text-zinc-200">Waiting for group members</p><p className="mt-1 text-[11px] sm:text-sm text-zinc-400">Copy the call link to share it yourself.</p></div></div>}
        </div>
      </section>
      <footer className="shrink-0 sticky bottom-0 border-t border-white/10 bg-zinc-900/95 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <ControlButton label={audioEnabled ? "Mute microphone" : "Unmute microphone"} active={audioEnabled} onClick={toggleAudio} testId="group-call-toggle-mic">{audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}</ControlButton>
          {!audioOnly && <ControlButton label={videoEnabled ? "Turn camera off" : "Turn camera on"} active={videoEnabled} onClick={toggleVideo} testId="group-call-toggle-camera">{videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}</ControlButton>}
          {!audioOnly && supportsShare && <ControlButton label={sharing ? "Stop sharing" : "Share screen"} active={!sharing} disabled={shareBusy} onClick={() => { void toggleShare(); }} testId="group-call-share-screen">{shareBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Monitor className="h-5 w-5" />}</ControlButton>}
          <ControlButton label="Leave call" danger onClick={() => { void leaveCall(); }} testId="group-call-leave"><PhoneOff className="h-5 w-5" /></ControlButton>
        </div>
      </footer>
    </main>
  );
}

function VideoTile({ participant, videoEnabled, audioEnabled, registerAudio, onSoundBlocked, onRetry }: {
  participant: TileParticipant;
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  registerAudio: (userId: number, element: HTMLAudioElement | null) => void;
  onSoundBlocked: () => void;
  onRetry: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const callbacks = useRef({ registerAudio, onSoundBlocked });
  callbacks.current = { registerAudio, onSoundBlocked };
  const [, updateTrackState] = useState(0);
  const stream = participant.stream;
  const userId = participant.userId;
  const isLocal = participant.isLocal;

  useEffect(() => {
    let disposed = false;
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      if (stream) void video.play().catch(() => {}); // Always muted: audio uses one separate element.
    }
    const audio = audioRef.current;
    const playAudio = () => {
      if (audio && !isLocal && stream?.getAudioTracks().length)
        void audio.play().catch(() => { if (!disposed) callbacks.current.onSoundBlocked(); });
    };
    if (audio && !isLocal) {
      callbacks.current.registerAudio(userId, audio);
      audio.srcObject = stream;
      playAudio();
      stream?.addEventListener("addtrack", playAudio);
    }
    return () => {
      disposed = true;
      stream?.removeEventListener("addtrack", playAudio);
      if (video) { video.pause(); video.srcObject = null; }
      if (audio) { audio.pause(); audio.srcObject = null; }
      if (!isLocal) callbacks.current.registerAudio(userId, null);
    };
  }, [stream, isLocal, userId]);

  useEffect(() => {
    if (!stream) return;
    const update = () => updateTrackState(value => value + 1);
    const tracks = stream.getTracks();
    tracks.forEach(track => {
      track.addEventListener("mute", update);
      track.addEventListener("unmute", update);
      track.addEventListener("ended", update);
    });
    stream.addEventListener("addtrack", update);
    stream.addEventListener("removetrack", update);
    return () => {
      tracks.forEach(track => {
        track.removeEventListener("mute", update);
        track.removeEventListener("unmute", update);
        track.removeEventListener("ended", update);
      });
      stream.removeEventListener("addtrack", update);
      stream.removeEventListener("removetrack", update);
    };
  }, [stream]);

  const hasVideo = videoEnabled !== false && !!stream?.getVideoTracks().some(track => track.enabled && !track.muted && track.readyState === "live");
  return (
    <article className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900" data-testid={isLocal ? "group-call-tile-local" : `group-call-tile-${userId}`} data-peer-status={participant.status}>
      {/* Media nodes never depend on hasVideo. Audio-only calls and newly
          arriving tracks must not lose srcObject through conditional remounts. */}
      <video ref={videoRef} autoPlay playsInline muted className={cn("absolute inset-0 h-full w-full object-cover", !hasVideo && "invisible", isLocal && participant.status !== "Sharing screen" && "-scale-x-100")} data-testid={isLocal ? "group-call-local-video" : `group-call-video-${userId}`} />
      {!isLocal && <audio ref={audioRef} autoPlay playsInline className="hidden" data-testid={`group-call-audio-${userId}`} />}
      {!hasVideo && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4"><Avatar className="h-16 w-16 sm:h-20 sm:w-20"><AvatarImage src={participant.avatar ?? undefined} /><AvatarFallback className="bg-zinc-700 text-white text-xl sm:text-2xl">{initials(participant.name)}</AvatarFallback></Avatar><span className="max-w-full truncate text-sm sm:text-base font-medium">{isLocal ? "You" : participant.name}</span></div>}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-3 pt-8">
        <div className="flex items-center justify-between gap-2"><span className="truncate text-xs sm:text-sm font-medium">{isLocal ? `${participant.name} (You)` : participant.name}</span>{isLocal && audioEnabled === false && <MicOff className="h-4 w-4 shrink-0 text-red-300" aria-label="Microphone muted" />}</div>
        <p className={cn("mt-1 text-xs", participant.needsRetry ? "text-amber-200" : "text-zinc-300")} aria-live="polite">{participant.status}</p>
        {participant.needsRetry && <button onClick={onRetry} className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 text-xs hover:bg-white/25" data-testid={`group-call-retry-${userId}`}><RefreshCw className="h-3 w-3" />Leave and rejoin</button>}
      </div>
    </article>
  );
}

function ControlButton({ label, children, active = true, danger = false, disabled = false, onClick, testId }: {
  label: string;
  children: ReactNode;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  testId: string;
}) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} data-testid={testId} className="flex flex-col items-center gap-1.5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-lg">
    <span className={cn("flex h-12 w-12 items-center justify-center rounded-full transition-colors", danger ? "bg-red-600 text-white hover:bg-red-700" : active ? "bg-zinc-700 text-white hover:bg-zinc-600" : "bg-red-500/20 text-red-300 hover:bg-red-500/30")}>{children}</span>
    <span className="text-[11px] sm:text-xs text-zinc-300">{label}</span>
  </button>;
}
