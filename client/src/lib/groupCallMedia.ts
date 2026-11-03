export const GROUP_CALL_LIMIT = 4;
const MAX_SIGNAL_BYTES = 64 * 1024;

export type GroupSignalType = "offer" | "answer" | "ice-candidate";
export type GroupSignal = {
  id: number;
  fromUserId: number;
  type: string;
  payload: string;
};
export type GroupParticipant = {
  userId: number;
  joinedAt?: Date | string;
  user: { id: number; name: string | null; avatar: string | null };
};
export type GroupPeerView = {
  userId: number;
  name: string;
  avatar: string | null;
  stream: MediaStream | null;
  status: string;
  needsRetry: boolean;
};

export function groupMediaConstraints(type: "audio" | "video"): MediaStreamConstraints {
  return {
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: type === "audio" ? false : {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 20, max: 24 },
      facingMode: "user",
    },
  };
}

export function groupMediaError(error: unknown, type: "audio" | "video"): string {
  const name = error && typeof error === "object" && "name" in error ? error.name : "";
  const devices = type === "audio" ? "microphone" : "camera and microphone";
  if (name === "NotAllowedError" || name === "SecurityError")
    return `Permission to use your ${devices} was denied. Allow access in your browser's site settings, then join again.`;
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return `We couldn't find a usable ${devices}. Connect your device and try again.`;
  if (name === "NotReadableError" || name === "AbortError")
    return `Your ${devices} may be in use by another app. Close that app and try again.`;
  if (error instanceof Error && error.message) return error.message;
  return `Could not join the call. Check your ${devices} and connection, then try again.`;
}

export function stopGroupStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach(track => track.stop());
}

/** Keeps work in order even when another batch arrives during setRemoteDescription. */
export class GroupSignalQueue {
  private tail: Promise<void> = Promise.resolve();
  private seen = new Set<number>();
  private closed = false;

  run(work: () => Promise<void>): Promise<void> {
    const next = this.tail.then(async () => { if (!this.closed) await work(); });
    this.tail = next.catch(() => {});
    return next;
  }

  enqueue(signals: GroupSignal[], handle: (signal: GroupSignal) => Promise<void>, onError: (error: unknown, signal: GroupSignal) => void): Promise<void> {
    // Claim IDs synchronously, before the first await, so overlapping batches
    // cannot process the same server signal a second time.
    const fresh = signals.filter(signal => {
      if (this.seen.has(signal.id)) return false;
      this.seen.add(signal.id);
      return true;
    });
    return this.run(async () => {
      for (const signal of fresh) {
        if (this.closed) break;
        try { await handle(signal); } catch (error) { onError(error, signal); }
      }
    });
  }

  close(): void { this.closed = true; this.seen.clear(); }
}

export async function flushGroupIce(peer: RTCPeerConnection, pending: RTCIceCandidateInit[]): Promise<void> {
  if (!peer.remoteDescription || peer.signalingState === "closed") return;
  while (pending.length) {
    if (String(peer.signalingState) === "closed") break;
    const candidate = pending.shift()!;
    try { await peer.addIceCandidate(candidate); } catch { /* A replaced peer may reject late ICE. */ }
  }
}

export function parseGroupSignal(signal: GroupSignal): RTCSessionDescriptionInit | RTCIceCandidateInit {
  if (new TextEncoder().encode(signal.payload).length > MAX_SIGNAL_BYTES)
    throw new Error("Call signal is too large.");
  const value: unknown = JSON.parse(signal.payload);
  if (!value || typeof value !== "object") throw new Error("Invalid call signal.");
  const payload = value as Record<string, unknown>;
  if (signal.type === "offer" || signal.type === "answer") {
    if (payload.type !== signal.type || typeof payload.sdp !== "string") throw new Error("Invalid call description.");
    return { type: signal.type, sdp: payload.sdp };
  }
  if (signal.type === "ice-candidate" && typeof payload.candidate === "string")
    return value as RTCIceCandidateInit;
  throw new Error("Unsupported call signal.");
}

type Peer = {
  pc: RTCPeerConnection;
  view: GroupPeerView;
  membership: string;
  disconnectTimer?: ReturnType<typeof setTimeout>;
};
type MediaOptions = {
  userId: number;
  stream: MediaStream;
  iceServers: RTCIceServer[];
  sendSignal: (toUserId: number, type: GroupSignalType, payload: string) => Promise<unknown>;
  onPeers: (peers: GroupPeerView[]) => void;
  onPreview: (stream: MediaStream, sharing: boolean) => void;
};

/** One instance per explicit Join. Never reused after leave or a cancelled join. */
export class GroupCallMedia {
  readonly stream: MediaStream;
  private options: MediaOptions;
  private alive = true;
  private peers = new Map<number, Peer>();
  private participants = new Map<number, GroupParticipant>();
  private candidates = new Map<number, RTCIceCandidateInit[]>();
  private queue = new GroupSignalQueue();
  private display: MediaStream | null = null;
  private sharePending = false;
  private videoEnabled = true;

  constructor(options: MediaOptions) { this.options = options; this.stream = options.stream; }
  get active(): boolean { return this.alive; }
  get sharing(): boolean { return !!this.display; }

  private publish(): void {
    if (this.alive) this.options.onPeers(Array.from(this.peers.values()).map(peer => ({ ...peer.view })));
  }
  private membership(participant?: GroupParticipant): string {
    return participant?.joinedAt ? String(new Date(participant.joinedAt).getTime()) : "";
  }
  private currentTrack(): MediaStreamTrack | undefined {
    return this.display?.getVideoTracks()[0] ?? this.stream.getVideoTracks()[0];
  }
  private closePeer(userId: number, discardIce = true): void {
    const peer = this.peers.get(userId);
    if (peer) {
      clearTimeout(peer.disconnectTimer);
      peer.pc.onicecandidate = null;
      peer.pc.ontrack = null;
      peer.pc.onconnectionstatechange = null;
      peer.pc.oniceconnectionstatechange = null;
      peer.pc.close();
      this.peers.delete(userId);
    }
    if (discardIce) this.candidates.delete(userId);
  }
  private isCurrent(userId: number, peer: Peer): boolean {
    return this.alive && this.peers.get(userId) === peer && peer.pc.signalingState !== "closed";
  }
  private fail(userId: number): void {
    const peer = this.peers.get(userId);
    if (!this.alive || !peer) return;
    peer.view.status = "Connection failed — rejoin to retry";
    peer.view.needsRetry = true;
    this.publish();
  }
  private async send(userId: number, type: GroupSignalType, payload: RTCSessionDescriptionInit | RTCIceCandidateInit): Promise<void> {
    if (!this.alive) return;
    const encoded = JSON.stringify(payload);
    if (new TextEncoder().encode(encoded).length > MAX_SIGNAL_BYTES) throw new Error("Call signal is too large.");
    await this.options.sendSignal(userId, type, encoded);
  }

  private createPeer(userId: number): Peer {
    const existing = this.peers.get(userId);
    if (existing) return existing;
    if (!this.alive || this.peers.size >= GROUP_CALL_LIMIT - 1) throw new Error("This call supports four people, including you.");
    const participant = this.participants.get(userId);
    const pc = new RTCPeerConnection({ iceServers: this.options.iceServers });
    const peer: Peer = {
      pc,
      membership: this.membership(participant),
      view: {
        userId, name: participant?.user.name ?? "Group member", avatar: participant?.user.avatar ?? null,
        stream: null, status: "Connecting…", needsRetry: false,
      },
    };
    this.peers.set(userId, peer); // Register before async negotiation: only one PC per ID.
    this.stream.getAudioTracks().forEach(track => pc.addTrack(track, this.stream));
    const video = this.currentTrack();
    if (video) pc.addTrack(video, this.stream);
    pc.onicecandidate = event => {
      if (event.candidate && this.isCurrent(userId, peer))
        void this.send(userId, "ice-candidate", event.candidate.toJSON()).catch(() => {
          if (this.isCurrent(userId, peer)) this.fail(userId);
        });
    };
    pc.ontrack = event => {
      if (!this.isCurrent(userId, peer)) return;
      const stream = peer.view.stream ?? event.streams[0] ?? new MediaStream();
      if (!stream.getTracks().some(track => track.id === event.track.id)) stream.addTrack(event.track);
      peer.view.stream = stream;
      event.track.addEventListener("mute", () => this.publish());
      event.track.addEventListener("unmute", () => this.publish());
      event.track.addEventListener("ended", () => this.publish());
      this.publish();
    };
    const updateConnection = () => {
      if (!this.isCurrent(userId, peer)) return;
      const state = pc.connectionState;
      if (state === "failed" || pc.iceConnectionState === "failed") { this.fail(userId); return; }
      if (state === "disconnected" || pc.iceConnectionState === "disconnected") {
        peer.view.status = "Connection interrupted — reconnecting…";
        if (!peer.disconnectTimer) peer.disconnectTimer = setTimeout(() => {
          if (this.isCurrent(userId, peer)) this.fail(userId);
        }, 10_000);
      } else {
        clearTimeout(peer.disconnectTimer);
        peer.disconnectTimer = undefined;
        peer.view.status = state === "connected" ? "Connected" : "Connecting…";
        peer.view.needsRetry = false;
      }
      this.publish();
    };
    pc.onconnectionstatechange = updateConnection;
    pc.oniceconnectionstatechange = updateConnection;
    this.publish();
    return peer;
  }

  syncParticipants(participants: GroupParticipant[]): Promise<void> {
    return this.queue.run(async () => {
      if (!this.alive) return;
      const remote = participants.filter(p => p.userId !== this.options.userId).slice(0, GROUP_CALL_LIMIT - 1);
      this.participants = new Map(remote.map(p => [p.userId, p]));
      Array.from(this.peers.keys()).forEach(userId => {
        if (!this.participants.has(userId)) this.closePeer(userId);
      });
      for (const participant of remote) {
        if (!this.alive) return;
        const userId = participant.userId;
        let peer = this.peers.get(userId);
        const membership = this.membership(participant);
        // Only the smaller ID offers. On same-ID rejoin that side starts a new
        // connection; the other side replaces its old PC upon the fresh offer.
        // This also tolerates the offer arriving before the membership poll.
        if (peer && peer.membership !== membership && this.options.userId < userId) {
          this.closePeer(userId);
          peer = undefined;
        }
        const isNew = !peer;
        try {
          peer = peer ?? this.createPeer(userId);
          peer.membership = membership;
          peer.view.name = participant.user.name ?? "Group member";
          peer.view.avatar = participant.user.avatar ?? null;
          if (isNew && this.options.userId < userId) {
            const offer = await peer.pc.createOffer();
            if (!this.isCurrent(userId, peer)) continue;
            await peer.pc.setLocalDescription(offer);
            if (this.isCurrent(userId, peer)) await this.send(userId, "offer", peer.pc.localDescription ?? offer);
          }
        } catch { this.fail(userId); }
      }
      this.publish();
    });
  }

  processSignals(signals: GroupSignal[]): Promise<void> {
    return this.queue.enqueue(signals, async signal => {
      const userId = signal.fromUserId;
      if (!this.alive || userId === this.options.userId || !Number.isInteger(userId) || userId <= 0) return;
      const payload = parseGroupSignal(signal);
      let peer = this.peers.get(userId);
      if (signal.type === "ice-candidate") {
        // Candidates may precede both a PC and its offer. Keep them until a
        // remote description exists, instead of silently dropping them.
        if (!this.candidates.has(userId) && this.candidates.size >= GROUP_CALL_LIMIT - 1) return;
        const pending = this.candidates.get(userId) ?? [];
        if (pending.length < 128) pending.push(payload as RTCIceCandidateInit);
        this.candidates.set(userId, pending);
        if (peer) await flushGroupIce(peer.pc, pending);
        return;
      }
      if (signal.type === "offer") {
        if (userId >= this.options.userId) return; // No glare / second offerer.
        if (peer && peer.pc.signalingState === "stable" && peer.pc.remoteDescription) {
          this.closePeer(userId, false);
          peer = undefined;
        }
        peer = peer ?? this.createPeer(userId);
        await peer.pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
        if (!this.isCurrent(userId, peer)) return;
        await flushGroupIce(peer.pc, this.candidates.get(userId) ?? []);
        if (!this.isCurrent(userId, peer)) return;
        const answer = await peer.pc.createAnswer();
        if (!this.isCurrent(userId, peer)) return;
        await peer.pc.setLocalDescription(answer);
        if (this.isCurrent(userId, peer)) await this.send(userId, "answer", peer.pc.localDescription ?? answer);
      } else if (signal.type === "answer" && peer && peer.pc.signalingState === "have-local-offer") {
        await peer.pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
        if (this.isCurrent(userId, peer)) await flushGroupIce(peer.pc, this.candidates.get(userId) ?? []);
      }
    }, (_error, signal) => this.fail(signal.fromUserId));
  }

  setAudioEnabled(enabled: boolean): void { this.stream.getAudioTracks().forEach(track => { track.enabled = enabled; }); }
  setVideoEnabled(enabled: boolean): void {
    this.videoEnabled = enabled;
    this.stream.getVideoTracks().forEach(track => { track.enabled = enabled; });
    this.display?.getVideoTracks().forEach(track => { track.enabled = enabled; });
  }

  private publishPreview(): void {
    if (!this.alive) return;
    const tracks: MediaStreamTrack[] = this.stream.getAudioTracks();
    const video = this.currentTrack();
    if (video) tracks.push(video);
    this.options.onPreview(new MediaStream(tracks), !!this.display);
  }
  private async replaceVideo(): Promise<void> {
    const track = this.currentTrack() ?? null;
    const peers = Array.from(this.peers.entries());
    await Promise.all(peers.map(async ([userId, peer]) => {
      const sender = peer.pc.getSenders().find(sender => sender.track?.kind === "video");
      if (!sender || !this.isCurrent(userId, peer)) return;
      try { await sender.replaceTrack(track); } catch {
        if (this.isCurrent(userId, peer)) this.fail(userId);
      }
    }));
    this.publishPreview();
  }
  async startScreenShare(): Promise<void> {
    if (!this.alive || this.display || this.sharePending) return;
    if (!this.stream.getVideoTracks().length || !navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen sharing is not supported in this call or browser.");
    this.sharePending = true;
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15, max: 20 } }, audio: false,
      });
      if (!this.alive) { stopGroupStream(display); return; }
      const track = display.getVideoTracks()[0];
      if (!track) { stopGroupStream(display); throw new Error("No screen was selected."); }
      this.display = display; // New peers must use the screen, not the camera.
      track.enabled = this.videoEnabled;
      track.onended = () => { void this.stopScreenShare(); };
      await this.replaceVideo();
    } finally { this.sharePending = false; }
  }
  async stopScreenShare(): Promise<void> {
    const display = this.display;
    if (!display) return;
    this.display = null;
    display.getTracks().forEach(track => { track.onended = null; track.stop(); });
    if (this.alive) await this.replaceVideo();
  }

  close(): void {
    if (!this.alive) return;
    this.alive = false;
    this.queue.close();
    Array.from(this.peers.keys()).forEach(userId => this.closePeer(userId));
    this.candidates.clear();
    this.participants.clear();
    this.display?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    this.display = null;
    stopGroupStream(this.stream);
  }
}
