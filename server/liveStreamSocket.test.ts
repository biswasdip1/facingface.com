import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server as SocketServer } from "socket.io";
import {
  io as connectClient,
  type Socket as ClientSocket,
} from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LIVE_STREAM_DURATION_MS,
  LIVE_STREAM_WARNING_MS,
  liveStreamDeadline,
} from "../shared/liveStream";

type Row = {
  id: number;
  hostId: number;
  startedAt: Date;
  status: "active" | "ended";
  viewerCount: number;
};
const db = vi.hoisted(() => ({
  rows: new Map<number, Row>(),
  getLiveStream: vi.fn(),
  endLiveStream: vi.fn(),
  updateViewerCount: vi.fn(),
  isUserSuspended: vi.fn(),
}));
vi.mock("./db", () => db);
// No production SDK, cookie service, database connection, or Messenger changes.
vi.mock("./callSignaling", () => ({ initCallSignaling: vi.fn() }));
import {
  attachLiveStreamHandlers,
  endLiveStreamSession,
  MAX_STREAM_DURATION_MS,
  registerLiveStreamDeadline,
} from "./liveStream";

let httpServer: HttpServer;
let io: SocketServer;
let url: string;
let nextId = 10_000;
let clients: ClientSocket[] = [];

function stream(hostId = 1, startedAt = new Date()): Row {
  const row: Row = {
    id: nextId++,
    hostId,
    startedAt,
    status: "active",
    viewerCount: 0,
  };
  db.rows.set(row.id, row);
  return row;
}

function event<T = Record<string, unknown>>(
  socket: ClientSocket,
  name: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(name, handler);
      reject(new Error(`Timed out waiting for ${name}`));
    }, 2000);
    const handler = (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(name, handler);
  });
}

async function client(userId = 2): Promise<ClientSocket> {
  const socket = connectClient(url, {
    path: "/api/socket.io",
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
    autoConnect: false,
    auth: { testUserId: userId },
  });
  clients.push(socket);
  const connected = event(socket, "connect");
  socket.connect();
  await connected;
  return socket;
}

async function host(socket: ClientSocket, row: Row) {
  const ready = event(socket, "live:host:ready");
  socket.emit("live:host", { streamId: row.id });
  return ready;
}

async function join(socket: ClientSocket, row: Row) {
  const joined = event(socket, "live:joined");
  socket.emit("live:join", { streamId: row.id });
  return joined;
}

async function rejected(socket: ClientSocket, name: string, payload: unknown) {
  const error = event<{ message: string }>(socket, "live:error");
  socket.emit(name, payload);
  return error;
}

beforeEach(async () => {
  vi.useRealTimers();
  vi.clearAllMocks();
  db.rows.clear();
  clients = [];
  db.getLiveStream.mockImplementation(async (id: number) => {
    const row = db.rows.get(id);
    return row ? { ...row } : undefined;
  });
  db.endLiveStream.mockImplementation(async (id: number, hostId: number) => {
    const row = db.rows.get(id);
    if (row?.hostId === hostId && row.status === "active") {
      row.status = "ended";
      row.viewerCount = 0;
    }
  });
  db.updateViewerCount.mockImplementation(async (id: number, delta: number) => {
    const row = db.rows.get(id);
    if (row) row.viewerCount = Math.max(0, row.viewerCount + delta);
  });
  db.isUserSuspended.mockResolvedValue({ suspended: false });
  httpServer = createServer();
  io = new SocketServer(httpServer, { path: "/api/socket.io" });
  io.use((socket, next) => {
    // Test-only identity fixture stands in for the existing call middleware.
    socket.data.userId = socket.handshake.auth.testUserId;
    next();
  });
  attachLiveStreamHandlers(io);
  await new Promise<void>(resolve =>
    httpServer.listen(0, "127.0.0.1", resolve)
  );
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
});

afterEach(async () => {
  vi.useRealTimers();
  for (const row of Array.from(db.rows.values())) {
    await endLiveStreamSession(row.id, row.hostId);
  }
  for (const socket of clients) socket.disconnect();
  await new Promise<void>(resolve => io.close(() => resolve()));
  vi.restoreAllMocks();
});

describe("authenticated livestream socket lifecycle", () => {
  it("serves two viewers with exact counts and unambiguous peer identity", async () => {
    const row = stream();
    const broadcaster = await client(1);
    const first = await client(2);
    const second = await client(3);
    const ready = await host(broadcaster, row);
    expect(MAX_STREAM_DURATION_MS).toBe(300_000);
    expect(ready).toMatchObject({
      streamId: row.id,
      viewerCount: 0,
      expiresAt: liveStreamDeadline(row.startedAt),
    });
    expect(ready.serverNow).toEqual(expect.any(Number));
    const firstNotice = event(broadcaster, "live:viewer:joined");
    expect(await join(first, row)).toMatchObject({
      viewerCount: 1,
      expiresAt: ready.expiresAt,
    });
    expect(await firstNotice).toMatchObject({
      viewerSocketId: first.id,
      viewerCount: 1,
    });
    const countForFirst = event(first, "live:viewers");
    const secondNotice = event(broadcaster, "live:viewer:joined");
    expect(await join(second, row)).toMatchObject({ viewerCount: 2 });
    expect(await secondNotice).toMatchObject({
      viewerSocketId: second.id,
      viewerCount: 2,
    });
    expect(await countForFirst).toMatchObject({
      streamId: row.id,
      viewerCount: 2,
    });

    for (const viewer of [first, second]) {
      const offered = event(viewer, "live:offer");
      const offer = { type: "offer", sdp: `v=0\r\na=viewer:${viewer.id}` };
      broadcaster.emit("live:offer", { targetSocketId: viewer.id, offer });
      expect(await offered).toEqual({
        streamId: row.id,
        hostSocketId: broadcaster.id,
        senderSocketId: broadcaster.id,
        offer,
      });
      const answered = event(broadcaster, "live:answer");
      const answer = { type: "answer", sdp: "v=0\r\n" };
      viewer.emit("live:answer", { targetSocketId: broadcaster.id, answer });
      expect(await answered).toEqual({
        streamId: row.id,
        viewerSocketId: viewer.id,
        senderSocketId: viewer.id,
        answer,
      });
      const incomingIce = event(broadcaster, "live:ice");
      const candidate = {
        candidate: "candidate:1 1 UDP 1 127.0.0.1 1234 typ host",
        sdpMid: "0",
        sdpMLineIndex: 0,
      };
      viewer.emit("live:ice", { targetSocketId: broadcaster.id, candidate });
      expect(await incomingIce).toEqual({
        streamId: row.id,
        senderSocketId: viewer.id,
        candidate,
      });
      const outgoingIce = event(viewer, "live:ice");
      broadcaster.emit("live:ice", { targetSocketId: viewer.id, candidate });
      expect(await outgoingIce).toEqual({
        streamId: row.id,
        senderSocketId: broadcaster.id,
        candidate,
      });
    }
    await vi.waitFor(() => expect(db.rows.get(row.id)?.viewerCount).toBe(2));
  });

  it("queues viewers arriving before the host, and does not inflate duplicate joins", async () => {
    const row = stream();
    const viewer = await client(2);
    const broadcaster = await client(1);
    expect(await join(viewer, row)).toMatchObject({ viewerCount: 1 });
    expect(await join(viewer, row)).toMatchObject({ viewerCount: 1 });
    const waitingNotice = event(broadcaster, "live:viewer:joined");
    expect(await host(broadcaster, row)).toMatchObject({ viewerCount: 1 });
    expect(await waitingNotice).toMatchObject({
      viewerSocketId: viewer.id,
      viewerCount: 1,
    });
    const noticeSpy = vi.fn();
    broadcaster.on("live:viewer:joined", noticeSpy);
    expect(await join(viewer, row)).toMatchObject({ viewerCount: 1 });
    await host(broadcaster, row);
    expect(noticeSpy).not.toHaveBeenCalled();
    expect(
      db.updateViewerCount.mock.calls.filter(
        ([id, delta]) => id === row.id && delta === 1
      )
    ).toHaveLength(1);
    expect(
      await rejected(broadcaster, "live:join", { streamId: row.id })
    ).toMatchObject({ message: expect.stringMatching(/host.*broadcaster/i) });
    expect(db.rows.get(row.id)?.viewerCount).toBe(1);
  });

  it("denies cross-stream, viewer-to-viewer, unregistered and malformed signaling", async () => {
    const one = stream(1);
    const two = stream(4);
    const broadcaster = await client(1);
    const viewer = await client(2);
    const otherViewer = await client(3);
    const otherHost = await client(4);
    const outsider = await client(5);
    await host(broadcaster, one);
    await join(viewer, one);
    await host(otherHost, two);
    await join(otherViewer, two);
    const relayed = vi.fn();
    for (const socket of clients) {
      socket.on("live:offer", relayed);
      socket.on("live:answer", relayed);
      socket.on("live:ice", relayed);
    }
    const validOffer = { type: "offer", sdp: "v=0\r\n" };
    const validAnswer = { type: "answer", sdp: "v=0\r\n" };
    const candidate = { candidate: "candidate:test", sdpMLineIndex: 0 };
    await rejected(broadcaster, "live:offer", {
      targetSocketId: otherViewer.id,
      offer: validOffer,
    });
    await rejected(broadcaster, "live:offer", {
      targetSocketId: outsider.id,
      offer: validOffer,
    });
    await rejected(viewer, "live:offer", {
      targetSocketId: broadcaster.id,
      offer: validOffer,
    });
    await rejected(viewer, "live:answer", {
      targetSocketId: otherHost.id,
      answer: validAnswer,
    });
    await rejected(viewer, "live:ice", {
      targetSocketId: otherViewer.id,
      candidate,
    });
    await rejected(outsider, "live:ice", {
      targetSocketId: broadcaster.id,
      candidate,
    });
    await rejected(broadcaster, "live:offer", {
      targetSocketId: viewer.id,
      streamId: two.id,
      offer: validOffer,
    });
    await rejected(broadcaster, "live:offer", {
      targetSocketId: viewer.id,
      offer: { type: "answer", sdp: "v=0" },
    });
    await rejected(viewer, "live:answer", {
      targetSocketId: broadcaster.id,
      answer: { type: "answer", sdp: 123 },
    });
    await rejected(viewer, "live:ice", {
      targetSocketId: broadcaster.id,
      candidate: { candidate: "x", sdpMLineIndex: -1 },
    });
    await rejected(viewer, "live:ice", {
      targetSocketId: broadcaster.id,
      candidate: "not a candidate",
    });
    await rejected(viewer, "live:ice", null);
    await rejected(viewer, "live:answer", { answer: validAnswer });
    expect(relayed).not.toHaveBeenCalled();
  });

  it("blocks host/end spoofing and duplicate-host hijacking without disturbing the real host", async () => {
    const row = stream();
    const broadcaster = await client(1);
    const viewer = await client(2);
    const secondOwnerConnection = await client(1);
    await host(broadcaster, row);
    await join(viewer, row);
    expect(
      await rejected(viewer, "live:host", { streamId: row.id, hostId: 1 })
    ).toMatchObject({ message: expect.stringMatching(/owner/i) });
    expect(
      await rejected(viewer, "live:end", { streamId: row.id, hostId: 1 })
    ).toMatchObject({ message: expect.stringMatching(/owner/i) });
    expect(
      await rejected(secondOwnerConnection, "live:host", { streamId: row.id })
    ).toMatchObject({
      message: expect.stringMatching(/already broadcasting/i),
    });
    await rejected(secondOwnerConnection, "live:end", { streamId: row.id });
    expect(await endLiveStreamSession(row.id, 999)).toBe(false);
    expect(await endLiveStreamSession(999999, 1)).toBe(false);
    expect(db.endLiveStream).not.toHaveBeenCalled();
    const ended = event(viewer, "live:ended");
    broadcaster.emit("live:end", { streamId: row.id, hostId: 999 });
    expect(await ended).toMatchObject({
      streamId: row.id,
      reason: "host_ended",
    });
    await vi.waitFor(() =>
      expect(db.endLiveStream).toHaveBeenCalledWith(row.id, 1)
    );
    expect(io.sockets.adapter.rooms.has(`stream:${row.id}`)).toBe(false);
    const extraEnd = vi.fn();
    viewer.on("live:ended", extraEnd);
    expect(await endLiveStreamSession(row.id, 1)).toBe(true);
    expect(db.endLiveStream).toHaveBeenCalledTimes(1);
    expect(extraEnd).not.toHaveBeenCalled();
  });

  it("rejects invalid, missing, expired and suspended streams gracefully", async () => {
    const viewer = await client(2);
    for (const payload of [
      null,
      {},
      { streamId: "1" },
      { streamId: -1 },
      { streamId: 1.2 },
    ]) {
      expect(await rejected(viewer, "live:join", payload)).toMatchObject({
        message: expect.stringMatching(/invalid/i),
      });
    }
    await rejected(viewer, "live:host", undefined);
    await rejected(viewer, "live:join", { streamId: 999999 });
    const expired = stream(
      1,
      new Date(Date.now() - LIVE_STREAM_DURATION_MS - 1000)
    );
    expect(
      await rejected(viewer, "live:join", { streamId: expired.id })
    ).toMatchObject({ message: expect.stringMatching(/time limit/i) });
    expect(db.rows.get(expired.id)?.status).toBe("ended");
    const invalidStart = stream(1, new Date("not a date"));
    await rejected(viewer, "live:join", { streamId: invalidStart.id });
    const row = stream();
    const broadcaster = await client(1);
    db.isUserSuspended.mockResolvedValueOnce({ suspended: true });
    expect(
      await rejected(broadcaster, "live:host", { streamId: row.id })
    ).toMatchObject({ message: expect.stringMatching(/suspended/i) });
    expect(io.sockets.adapter.rooms.has(`stream:${row.id}`)).toBe(false);
  });

  it("decrements viewers once, cleans old stream rooms on switching and ends on host disconnect", async () => {
    const one = stream(1);
    const two = stream(4);
    const broadcaster = await client(1);
    const viewer = await client(2);
    const other = await client(3);
    await host(broadcaster, one);
    await join(viewer, one);
    await join(other, one);
    const left = event(broadcaster, "live:viewer:left");
    const count = event(other, "live:viewers");
    await join(viewer, two);
    expect(await left).toMatchObject({
      viewerSocketId: viewer.id,
      viewerCount: 1,
    });
    expect(await count).toMatchObject({ viewerCount: 1 });
    const serverViewer = io.sockets.sockets.get(viewer.id!);
    expect(serverViewer?.rooms.has(`stream:${one.id}`)).toBe(false);
    expect(serverViewer?.rooms.has(`stream:${two.id}`)).toBe(true);
    viewer.emit("live:leave", { streamId: two.id });
    await vi.waitFor(() =>
      expect(serverViewer?.rooms.has(`stream:${two.id}`)).toBe(false)
    );
    viewer.emit("live:leave", { streamId: two.id });
    viewer.disconnect();
    await vi.waitFor(() => expect(db.rows.get(two.id)?.viewerCount).toBe(0));
    expect(
      db.updateViewerCount.mock.calls.filter(
        ([id, delta]) => id === two.id && delta === -1
      )
    ).toHaveLength(1);
    const otherLeft = event(broadcaster, "live:viewer:left");
    other.disconnect();
    expect(await otherLeft).toMatchObject({ viewerCount: 0 });
    await vi.waitFor(() => expect(db.rows.get(one.id)?.viewerCount).toBe(0));
    const survivor = await client(5);
    await join(survivor, one);
    const ended = event(survivor, "live:ended");
    broadcaster.disconnect();
    expect(await ended).toMatchObject({ reason: "host_disconnected" });
    await vi.waitFor(() =>
      expect(io.sockets.adapter.rooms.has(`stream:${one.id}`)).toBe(false)
    );
    expect(db.endLiveStream).toHaveBeenCalledWith(one.id, 1);
  });

  it("prevents a disconnected or superseded database lookup from resurrecting membership", async () => {
    const row = stream();
    const newer = stream(4);
    const viewer = await client(2);
    const id = viewer.id!;
    let resolveLookup!: (row: Row) => void;
    db.getLiveStream.mockImplementationOnce(
      () =>
        new Promise<Row>(resolve => {
          resolveLookup = resolve;
        })
    );
    viewer.emit("live:join", { streamId: row.id });
    await vi.waitFor(() => expect(resolveLookup).toBeTypeOf("function"));
    viewer.disconnect();
    await vi.waitFor(() => expect(io.sockets.sockets.has(id)).toBe(false));
    resolveLookup({ ...row });
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(io.sockets.adapter.rooms.has(`stream:${row.id}`)).toBe(false);
    expect(db.updateViewerCount).not.toHaveBeenCalled();

    const second = await client(3);
    let finishOld!: (row: Row) => void;
    db.getLiveStream.mockImplementationOnce(
      () =>
        new Promise<Row>(resolve => {
          finishOld = resolve;
        })
    );
    second.emit("live:join", { streamId: row.id });
    await vi.waitFor(() => expect(finishOld).toBeTypeOf("function"));
    await join(second, newer);
    finishOld({ ...row });
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(
      io.sockets.sockets.get(second.id!)?.rooms.has(`stream:${row.id}`)
    ).toBe(false);
    expect(db.rows.get(newer.id)?.viewerCount).toBe(1);
  });

  it("explicit leave cancels a pending join, and repeated host acknowledgements keep the original deadline", async () => {
    const row = stream();
    const viewer = await client(2);
    let resolveLookup!: (row: Row) => void;
    db.getLiveStream.mockImplementationOnce(
      () =>
        new Promise<Row>(resolve => {
          resolveLookup = resolve;
        })
    );
    viewer.emit("live:join", { streamId: row.id });
    await vi.waitFor(() => expect(resolveLookup).toBeTypeOf("function"));
    viewer.emit("live:leave", { streamId: row.id });
    // A socket acknowledgement acts as a barrier after the preceding leave.
    io.sockets.sockets.get(viewer.id!)?.on("test:barrier", ack => ack());
    await new Promise<void>(resolve => viewer.emit("test:barrier", resolve));
    resolveLookup({ ...row });
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(io.sockets.adapter.rooms.has(`stream:${row.id}`)).toBe(false);
    expect(db.updateViewerCount).not.toHaveBeenCalled();

    const broadcaster = await client(1);
    const first = await host(broadcaster, row);
    await new Promise(resolve => setTimeout(resolve, 20));
    const second = await host(broadcaster, row);
    expect(second.expiresAt).toBe(first.expiresAt);
    expect(second.serverNow as number).toBeGreaterThan(
      first.serverNow as number
    );
    expect(second.viewerCount).toBe(0);
  });

  it("catches database failures and keeps the connection usable", async () => {
    const row = stream();
    const viewer = await client(2);
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    db.getLiveStream.mockRejectedValueOnce(
      new Error("test database unavailable")
    );
    expect(
      await rejected(viewer, "live:join", { streamId: row.id })
    ).toMatchObject({ message: expect.stringMatching(/unable/i) });
    db.updateViewerCount.mockRejectedValueOnce(new Error("count unavailable"));
    expect(await join(viewer, row)).toMatchObject({ viewerCount: 1 });
    await vi.waitFor(() => expect(log).toHaveBeenCalledTimes(2));
    expect(viewer.connected).toBe(true);
  });
});

describe("creation-anchored deadlines", () => {
  function fakeRoomIo() {
    const emit = vi.fn();
    const socketsLeave = vi.fn();
    const fakeIo = {
      on: vi.fn(),
      to: vi.fn(() => ({ emit })),
      in: vi.fn(() => ({ socketsLeave })),
    };
    attachLiveStreamHandlers(fakeIo as unknown as SocketServer);
    return { emit, socketsLeave };
  }

  it("expires a created stream without any camera or host, with a 30-second warning", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    const { emit } = fakeRoomIo();
    const row = stream();
    registerLiveStreamDeadline(row);
    await vi.advanceTimersByTimeAsync(
      LIVE_STREAM_DURATION_MS - LIVE_STREAM_WARNING_MS - 1
    );
    expect(emit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(emit).toHaveBeenCalledWith(
      "live:time-warning",
      expect.objectContaining({
        streamId: row.id,
        secondsLeft: 30,
        expiresAt: liveStreamDeadline(row.startedAt),
      })
    );
    await vi.advanceTimersByTimeAsync(LIVE_STREAM_WARNING_MS);
    expect(emit).toHaveBeenCalledWith("live:ended", {
      streamId: row.id,
      reason: "time_limit",
    });
    expect(db.endLiveStream).toHaveBeenCalledWith(row.id, 1);
    expect(db.rows.get(row.id)?.status).toBe("ended");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("anchors delayed and repeated host registration to the original database start", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    const { emit } = fakeRoomIo();
    const row = stream(1, new Date(Date.now() - 60_000));
    registerLiveStreamDeadline(row);
    await vi.advanceTimersByTimeAsync(120_000);
    // Even an accidentally newer registration must never extend the deadline.
    registerLiveStreamDeadline({ ...row, startedAt: new Date() });
    await vi.advanceTimersByTimeAsync(90_000);
    expect(emit).toHaveBeenCalledWith(
      "live:time-warning",
      expect.objectContaining({ secondsLeft: 30 })
    );
    await vi.advanceTimersByTimeAsync(30_000);
    expect(db.endLiveStream).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("live:ended", {
      streamId: row.id,
      reason: "time_limit",
    });
  });

  it("manual API end cancels warning/expiry timers and stays idempotent", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    const { emit, socketsLeave } = fakeRoomIo();
    const row = stream();
    registerLiveStreamDeadline(row);
    expect(vi.getTimerCount()).toBe(2);
    expect(await endLiveStreamSession(row.id, 2)).toBe(false);
    expect(vi.getTimerCount()).toBe(2);
    expect(await endLiveStreamSession(row.id, 1)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(socketsLeave).toHaveBeenCalledWith(`stream:${row.id}`);
    expect(await endLiveStreamSession(row.id, 1)).toBe(true);
    await vi.advanceTimersByTimeAsync(LIVE_STREAM_DURATION_MS);
    expect(
      emit.mock.calls.filter(([name]) => name === "live:ended")
    ).toHaveLength(1);
    expect(
      emit.mock.calls.filter(([name]) => name === "live:time-warning")
    ).toHaveLength(0);
    expect(db.endLiveStream).toHaveBeenCalledTimes(1);
  });

  it("still notifies at expiry after lazy database expiration and on failed writes", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    const { emit } = fakeRoomIo();
    const row = stream();
    registerLiveStreamDeadline(row);
    row.status = "ended"; // Simulate an API read lazily expiring the database row.
    await vi.advanceTimersByTimeAsync(LIVE_STREAM_DURATION_MS);
    expect(emit).toHaveBeenCalledWith("live:ended", {
      streamId: row.id,
      reason: "time_limit",
    });

    const failed = stream();
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    registerLiveStreamDeadline(failed);
    db.endLiveStream.mockRejectedValueOnce(new Error("write unavailable"));
    await vi.advanceTimersByTimeAsync(LIVE_STREAM_DURATION_MS);
    expect(emit).toHaveBeenCalledWith("live:ended", {
      streamId: failed.id,
      reason: "time_limit",
    });
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/ending stream.*write unavailable/)
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it("manual cleanup of an already-ended owned stream notifies remaining peers just once", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    const { emit } = fakeRoomIo();
    const row = stream();
    registerLiveStreamDeadline(row);
    row.status = "ended";
    expect(await endLiveStreamSession(row.id, 1)).toBe(true);
    expect(await endLiveStreamSession(row.id, 1)).toBe(true);
    expect(emit).toHaveBeenCalledWith("live:ended", {
      streamId: row.id,
      reason: "host_ended",
    });
    expect(
      emit.mock.calls.filter(([name]) => name === "live:ended")
    ).toHaveLength(1);
    expect(db.endLiveStream).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
