import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GroupCallMedia, GroupSignalQueue, flushGroupIce, groupMediaConstraints,
  groupMediaError, parseGroupSignal, type GroupParticipant, type GroupPeerView,
  type GroupSignalType,
} from "../client/src/lib/groupCallMedia";

class FakeTrack extends EventTarget {
  id: string;
  enabled = true;
  muted = false;
  readyState = "live";
  onended: (() => void) | null = null;
  stop = vi.fn(() => { this.readyState = "ended"; });
  constructor(readonly kind: string, id = kind) { super(); this.id = id; }
}
class FakeStream extends EventTarget {
  constructor(private tracks: FakeTrack[] = []) { super(); }
  getTracks() { return this.tracks; }
  getAudioTracks() { return this.tracks.filter(track => track.kind === "audio"); }
  getVideoTracks() { return this.tracks.filter(track => track.kind === "video"); }
  addTrack(track: FakeTrack) { this.tracks.push(track); }
}
class FakePeer {
  static instances: FakePeer[] = [];
  signalingState = "stable";
  connectionState = "new";
  iceConnectionState = "new";
  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;
  onicecandidate: ((event: { candidate: { toJSON: () => RTCIceCandidateInit } | null }) => void) | null = null;
  ontrack: ((event: { streams: FakeStream[]; track: FakeTrack }) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  senders: Array<{ track: FakeTrack | null; replaceTrack: ReturnType<typeof vi.fn> }> = [];
  createOffer = vi.fn(async () => ({ type: "offer", sdp: "offer-sdp" }));
  createAnswer = vi.fn(async () => ({ type: "answer", sdp: "answer-sdp" }));
  setLocalDescription = vi.fn(async (description: RTCSessionDescriptionInit) => {
    this.localDescription = description;
    this.signalingState = description.type === "offer" ? "have-local-offer" : "stable";
  });
  setRemoteDescription = vi.fn(async (description: RTCSessionDescriptionInit) => {
    this.remoteDescription = description;
    this.signalingState = description.type === "offer" ? "have-remote-offer" : "stable";
  });
  addIceCandidate = vi.fn(async (_candidate: RTCIceCandidateInit) => {});
  close = vi.fn(() => { this.signalingState = "closed"; this.connectionState = "closed"; });
  constructor(readonly config: RTCConfiguration) { FakePeer.instances.push(this); }
  addTrack(track: FakeTrack) {
    const sender = { track: track as FakeTrack | null, replaceTrack: vi.fn(async (replacement: FakeTrack | null) => { sender.track = replacement; }) };
    this.senders.push(sender);
    return sender;
  }
  getSenders() { return this.senders; }
}
const participant = (userId: number, joinedAt = "2026-11-03T10:00:00Z"): GroupParticipant => ({
  userId, joinedAt, user: { id: userId, name: `Member ${userId}`, avatar: null },
});
const candidate = { candidate: "candidate:1 1 UDP 1 127.0.0.1 1234 typ host", sdpMid: "0", sdpMLineIndex: 0 };
const signal = (id: number, fromUserId: number, type: GroupSignalType, payload: unknown) => ({ id, fromUserId, type, payload: JSON.stringify(payload) });
const relay = [{ urls: "turns:turn.example.test:443", username: "temporary", credential: "safe-browser-token" }];
let sessions: GroupCallMedia[];
function session(userId = 2, video = true) {
  const microphone = new FakeTrack("audio");
  const camera = new FakeTrack("video");
  const stream = new FakeStream(video ? [microphone, camera] : [microphone]);
  const onPeers = vi.fn<(peers: GroupPeerView[]) => void>();
  const onPreview = vi.fn();
  const sendSignal = vi.fn(async (_userId: number, _type: GroupSignalType, _payload: string) => {});
  const media = new GroupCallMedia({ userId, stream: stream as unknown as MediaStream, iceServers: relay, sendSignal, onPeers, onPreview });
  sessions.push(media);
  return { media, stream, microphone, camera, onPeers, onPreview, sendSignal };
}
beforeEach(() => {
  sessions = [];
  FakePeer.instances = [];
  vi.stubGlobal("RTCPeerConnection", FakePeer);
  vi.stubGlobal("MediaStream", FakeStream);
});
afterEach(() => {
  sessions.forEach(media => media.close());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("group-call capture and payloads", () => {
  it("never requests a camera in audio rooms and enables audio processing", () => {
    expect(groupMediaConstraints("audio")).toEqual({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false,
    });
    expect(groupMediaConstraints("video").video).toMatchObject({
      width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 20, max: 24 },
    });
  });
  it("explains denied, absent, and busy devices without mentioning cameras for audio calls", () => {
    expect(groupMediaError({ name: "NotAllowedError" }, "audio")).toContain("microphone");
    expect(groupMediaError({ name: "NotAllowedError" }, "audio")).not.toContain("camera");
    expect(groupMediaError({ name: "NotAllowedError" }, "video")).toContain("site settings");
    expect(groupMediaError({ name: "NotFoundError" }, "video")).toContain("Connect");
    expect(groupMediaError({ name: "NotReadableError" }, "video")).toContain("another app");
  });
  it("rejects malformed, mismatched, unsupported, and oversized JSON signals", () => {
    expect(() => parseGroupSignal(signal(1, 1, "offer", { type: "answer", sdp: "x" }))).toThrow();
    expect(() => parseGroupSignal({ id: 2, fromUserId: 1, type: "offer", payload: "{" })).toThrow();
    expect(() => parseGroupSignal({ id: 3, fromUserId: 1, type: "anything", payload: "{}" })).toThrow();
    expect(() => parseGroupSignal(signal(4, 1, "offer", { type: "offer", sdp: "x".repeat(65536) }))).toThrow("large");
    expect(parseGroupSignal(signal(5, 1, "ice-candidate", candidate))).toEqual(candidate);
  });
});

describe("group signal queue", () => {
  it("processes overlapping polls once, sequentially, and continues after a malformed signal", async () => {
    const queue = new GroupSignalQueue();
    const events: number[] = [];
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const handle = vi.fn(async (item: { id: number }) => {
      events.push(item.id);
      if (item.id === 1) await gate;
      if (item.id === 2) throw new Error("bad signal");
    });
    const onError = vi.fn();
    const first = queue.enqueue([signal(1, 1, "ice-candidate", candidate), signal(2, 1, "ice-candidate", candidate)], handle, onError);
    const next = queue.enqueue([signal(1, 1, "ice-candidate", candidate), signal(2, 1, "ice-candidate", candidate), signal(3, 1, "ice-candidate", candidate)], handle, onError);
    await Promise.resolve();
    expect(events).toEqual([1]);
    release();
    await Promise.all([first, next]);
    expect(events).toEqual([1, 2, 3]);
    expect(onError).toHaveBeenCalledTimes(1);
  });
  it("does not execute queued work after close", async () => {
    const queue = new GroupSignalQueue();
    const handler = vi.fn(async () => {});
    const work = queue.enqueue([signal(1, 1, "ice-candidate", candidate)], handler, vi.fn());
    queue.close();
    await work;
    expect(handler).not.toHaveBeenCalled();
  });
  it("retains ICE before a remote description and drains it in order afterwards", async () => {
    const peer = new FakePeer({});
    const pending = [candidate, { ...candidate, candidate: "candidate:2" }];
    await flushGroupIce(peer as unknown as RTCPeerConnection, pending);
    expect(pending).toHaveLength(2);
    expect(peer.addIceCandidate).not.toHaveBeenCalled();
    peer.remoteDescription = { type: "offer", sdp: "sdp" };
    await flushGroupIce(peer as unknown as RTCPeerConnection, pending);
    expect(pending).toHaveLength(0);
    expect(peer.addIceCandidate.mock.calls.map(call => call[0].candidate)).toEqual([candidate.candidate, "candidate:2"]);
  });
});

describe("four-person WebRTC mesh", () => {
  it("uses server TURN config, creates one PC per peer, and offers only to larger user IDs", async () => {
    const { media, sendSignal, onPeers } = session(2);
    const people = [participant(1), participant(2), participant(3), participant(4)];
    await Promise.all([media.syncParticipants(people), media.syncParticipants(people)]);
    expect(FakePeer.instances).toHaveLength(3);
    FakePeer.instances.forEach(peer => expect(peer.config.iceServers).toEqual(relay));
    expect(sendSignal.mock.calls.filter(call => call[1] === "offer").map(call => call[0])).toEqual([3, 4]);
    expect(onPeers.mock.calls.at(-1)?.[0].map(peer => peer.userId)).toEqual([1, 3, 4]);
  });
  it("caps remote peers at three even if a stale room snapshot contains extra people", async () => {
    const { media } = session(1);
    await media.syncParticipants([1, 2, 3, 4, 5, 6].map(id => participant(id)));
    expect(FakePeer.instances).toHaveLength(3);
  });
  it("queues ICE before any PC exists, applies it after the offer, and answers only once", async () => {
    const { media, sendSignal } = session(2);
    const early = signal(1, 1, "ice-candidate", candidate);
    const offer = signal(2, 1, "offer", { type: "offer", sdp: "sdp" });
    await media.processSignals([early]);
    expect(FakePeer.instances).toHaveLength(0);
    await Promise.all([media.processSignals([early, offer]), media.processSignals([offer])]);
    const peer = FakePeer.instances[0];
    expect(peer.addIceCandidate).toHaveBeenCalledTimes(1);
    expect(peer.addIceCandidate).toHaveBeenCalledWith(candidate);
    expect(peer.setRemoteDescription).toHaveBeenCalledTimes(1);
    expect(sendSignal.mock.calls.filter(call => call[1] === "answer")).toHaveLength(1);
  });
  it("awaits description and ICE before creating its answer even when polls overlap", async () => {
    const { media } = session(2);
    await media.syncParticipants([participant(1), participant(2)]);
    const peer = FakePeer.instances[0];
    let release!: () => void;
    peer.setRemoteDescription.mockImplementationOnce(async description => {
      await new Promise<void>(resolve => { release = resolve; });
      peer.remoteDescription = description;
      peer.signalingState = "have-remote-offer";
    });
    const first = media.processSignals([signal(1, 1, "offer", { type: "offer", sdp: "sdp" })]);
    await Promise.resolve();
    const second = media.processSignals([signal(2, 1, "ice-candidate", candidate)]);
    expect(peer.createAnswer).not.toHaveBeenCalled();
    expect(peer.addIceCandidate).not.toHaveBeenCalled();
    release();
    await Promise.all([first, second]);
    expect(peer.createAnswer).toHaveBeenCalledTimes(1);
    expect(peer.addIceCandidate).toHaveBeenCalledTimes(1);
  });
  it("applies answers and early ICE to the smaller-ID offerer's existing peer", async () => {
    const { media } = session(1);
    await media.syncParticipants([participant(1), participant(2)]);
    const peer = FakePeer.instances[0];
    await media.processSignals([signal(1, 2, "ice-candidate", candidate)]);
    expect(peer.addIceCandidate).not.toHaveBeenCalled();
    await media.processSignals([signal(2, 2, "answer", { type: "answer", sdp: "answer" })]);
    expect(peer.remoteDescription?.type).toBe("answer");
    expect(peer.addIceCandidate).toHaveBeenCalledTimes(1);
  });
  it("ignores offers from the larger ID instead of producing glare", async () => {
    const { media, sendSignal } = session(1);
    await media.syncParticipants([participant(1), participant(2)]);
    await media.processSignals([signal(1, 2, "offer", { type: "offer", sdp: "invalid-offerer" })]);
    expect(FakePeer.instances).toHaveLength(1);
    expect(sendSignal.mock.calls.filter(call => call[1] === "answer")).toHaveLength(0);
  });
  it("removes departed peers and renegotiates a same-user rejoin deterministically", async () => {
    const { media, sendSignal } = session(1);
    await media.syncParticipants([participant(1), participant(2)]);
    const old = FakePeer.instances[0];
    await media.syncParticipants([participant(1), participant(2, "2026-11-03T10:01:00Z")]);
    expect(old.close).toHaveBeenCalledTimes(1);
    expect(FakePeer.instances).toHaveLength(2);
    expect(sendSignal.mock.calls.filter(call => call[1] === "offer")).toHaveLength(2);
    await media.syncParticipants([participant(1)]);
    expect(FakePeer.instances[1].close).toHaveBeenCalledTimes(1);
  });
  it("accepts a fresh smaller-ID offer on rejoin and tolerates a later membership poll", async () => {
    const { media } = session(2);
    await media.syncParticipants([participant(1), participant(2)]);
    await media.processSignals([signal(1, 1, "offer", { type: "offer", sdp: "first" })]);
    const old = FakePeer.instances[0];
    await media.processSignals([signal(2, 1, "offer", { type: "offer", sdp: "fresh" })]);
    await media.syncParticipants([participant(1, "2026-11-03T10:01:00Z"), participant(2)]);
    expect(old.close).toHaveBeenCalledTimes(1);
    expect(FakePeer.instances).toHaveLength(2);
    expect(FakePeer.instances[1].remoteDescription?.sdp).toBe("fresh");
  });
  it("shows failed/disconnected peer states and clears disconnect timers on cleanup", async () => {
    vi.useFakeTimers();
    const { media, onPeers } = session(1);
    await media.syncParticipants([participant(1), participant(2)]);
    const peer = FakePeer.instances[0];
    peer.connectionState = "disconnected";
    peer.onconnectionstatechange?.();
    expect(onPeers.mock.calls.at(-1)?.[0][0].status).toContain("interrupted");
    await vi.advanceTimersByTimeAsync(10000);
    expect(onPeers.mock.calls.at(-1)?.[0][0].needsRetry).toBe(true);
    media.close();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("stops camera/microphone, closes PCs, and suppresses late offer work after cancellation", async () => {
    const { media, microphone, camera, sendSignal } = session(1);
    await media.syncParticipants([participant(1), participant(2)]);
    const peer = FakePeer.instances[0];
    media.close();
    media.close();
    expect(microphone.stop).toHaveBeenCalledTimes(1);
    expect(camera.stop).toHaveBeenCalledTimes(1);
    expect(peer.close).toHaveBeenCalledTimes(1);
    expect(peer.onicecandidate).toBeNull();
    const before = sendSignal.mock.calls.length;
    await media.processSignals([signal(1, 2, "answer", { type: "answer", sdp: "late" })]);
    expect(sendSignal.mock.calls.length).toBe(before);
  });
  it("does not set descriptions or send an offer that resolves after leave", async () => {
    const { media, sendSignal } = session(1);
    let release!: (offer: RTCSessionDescriptionInit) => void;
    const work = media.syncParticipants([participant(1), participant(2)]);
    // createPeer runs in the shared queue microtask. Hold createOffer before
    // allowing its awaited continuation to proceed.
    const original = FakePeer.prototype.addTrack;
    FakePeer.prototype.addTrack = function(track: FakeTrack) {
      this.createOffer.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
      return original.call(this, track);
    };
    try {
      await Promise.resolve();
      const peer = FakePeer.instances[0];
      media.close();
      release({ type: "offer", sdp: "late-offer" });
      await work;
      expect(peer.setLocalDescription).not.toHaveBeenCalled();
      expect(sendSignal).not.toHaveBeenCalled();
    } finally { FakePeer.prototype.addTrack = original; }
  });
});

describe("group-call screen sharing", () => {
  it("replaces camera, sends the shared track to new peers, and restores camera when sharing ends", async () => {
    const { media, camera, onPreview } = session(1);
    const screen = new FakeTrack("video", "screen");
    const display = new FakeStream([screen]);
    const getDisplayMedia = vi.fn(async () => display);
    vi.stubGlobal("navigator", { mediaDevices: { getDisplayMedia } });
    await media.syncParticipants([participant(1), participant(2)]);
    await media.startScreenShare();
    expect(FakePeer.instances[0].senders.find(sender => sender.track?.kind === "video")?.track).toBe(screen);
    await media.syncParticipants([participant(1), participant(2), participant(3)]);
    expect(FakePeer.instances[1].senders.find(sender => sender.track?.kind === "video")?.track).toBe(screen);
    media.setVideoEnabled(false);
    expect(screen.enabled).toBe(false);
    expect(camera.enabled).toBe(false);
    screen.onended?.();
    await media.stopScreenShare();
    await Promise.resolve();
    FakePeer.instances.forEach(peer => expect(peer.senders.find(sender => sender.track?.kind === "video")?.track).toBe(camera));
    expect(screen.stop).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(onPreview.mock.calls.at(-1)?.[1]).toBe(false));
  });
  it("stops a display stream returned after leave and does not attach it to closed peers", async () => {
    const { media } = session(1);
    const screen = new FakeTrack("video", "late-screen");
    let release!: (value: FakeStream) => void;
    vi.stubGlobal("navigator", { mediaDevices: { getDisplayMedia: () => new Promise<FakeStream>(resolve => { release = resolve; }) } });
    const sharing = media.startScreenShare();
    media.close();
    release(new FakeStream([screen]));
    await sharing;
    expect(screen.stop).toHaveBeenCalledTimes(1);
    expect(media.sharing).toBe(false);
  });
  it("stops display tracks on leave and keeps audio-room sessions camera-free", async () => {
    const { media } = session(1);
    const screen = new FakeTrack("video", "screen");
    vi.stubGlobal("navigator", { mediaDevices: { getDisplayMedia: vi.fn(async () => new FakeStream([screen])) } });
    await media.startScreenShare();
    media.close();
    expect(screen.stop).toHaveBeenCalledTimes(1);
    const audio = session(3, false);
    await audio.media.syncParticipants([participant(3), participant(4)]);
    expect(FakePeer.instances.at(-1)?.senders.map(sender => sender.track?.kind)).toEqual(["audio"]);
    await expect(audio.media.startScreenShare()).rejects.toThrow("not supported");
  });
});
