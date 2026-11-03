import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CallRoom, User } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { GROUP_CALL_MAX_PARTICIPANTS, GROUP_CALL_STALE_MS, groupCallSignalInputSchema, validGroupCallSignalPayload } from "../shared/groupCall";
import * as db from "./db";
import { appRouter } from "./routers";
import { getWebRtcRelayConfig } from "./webrtcRelay";

vi.mock("./db", async importOriginal => ({
  ...await importOriginal<typeof import("./db")>(),
  isGroupMember: vi.fn(), isUserBlocked: vi.fn(), createCallRoom: vi.fn(),
  getActiveCallRoomForGroup: vi.fn(), getCallRoom: vi.fn(), getActiveCallParticipants: vi.fn(),
  joinCallRoom: vi.fn(), leaveCallRoom: vi.fn(), sendCallSignal: vi.fn(), getUnconsumedSignals: vi.fn(),
}));
vi.mock("./webrtcRelay", () => ({ getWebRtcRelayConfig: vi.fn() }));

const now = new Date();
const room: CallRoom = { id: 42, groupId: 7, hostId: 1, type: "video", status: "active", startedAt: now, endedAt: null };
function user(id: number): User {
  return { id, name: `Person ${id}`, avatar: `/avatar-${id}`, email: `SECRET_EMAIL_${id}`, passwordHash: `SECRET_HASH_${id}` } as User;
}
function caller(id: number | null = 1) {
  return appRouter.createCaller({ user: id === null ? null : user(id), req: { headers: {} }, res: {} } as TrpcContext).calls;
}
function participant(id: number) {
  return { id, roomId: 42, userId: id, joinedAt: now, leftAt: null, user: user(id) };
}
const offer = { roomId: 42, toUserId: 2, type: "offer" as const, payload: JSON.stringify({ type: "offer", sdp: "v=0\r\n" }) };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(db.isGroupMember).mockResolvedValue(true);
  vi.mocked(db.isUserBlocked).mockResolvedValue(false);
  vi.mocked(db.createCallRoom).mockResolvedValue(42);
  vi.mocked(db.getCallRoom).mockImplementation(async id => id === 42 ? { ...room } : undefined);
  vi.mocked(db.getActiveCallRoomForGroup).mockResolvedValue({ ...room });
  vi.mocked(db.getActiveCallParticipants).mockResolvedValue([participant(1), participant(2)]);
  vi.mocked(db.getUnconsumedSignals).mockResolvedValue([]);
  vi.mocked(getWebRtcRelayConfig).mockResolvedValue({ iceServers: [{ urls: "stun:example.com" }], relayConfigured: false } as Awaited<ReturnType<typeof getWebRtcRelayConfig>>);
});

describe("group call API contract", () => {
  it("exports the shared four-person / 45-second policy", () => {
    expect(GROUP_CALL_MAX_PARTICIPANTS).toBe(4);
    expect(GROUP_CALL_STALE_MS).toBe(45000);
  });
  it.each(["getRoom", "join", "leave", "pollSignals"] as const)("%s requires authentication", async method => {
    await expect(caller(null)[method]({ roomId: 42 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.getCallRoom).not.toHaveBeenCalled();
  });
  it("preserves authenticated ICE configuration delegation", async () => {
    expect(await caller().iceServers()).toEqual(await getWebRtcRelayConfig());
    await expect(caller(null).iceServers()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("creates without a ghost join and preserves roomId/default video", async () => {
    expect(await caller().createRoom({ groupId: 7 })).toEqual({ roomId: 42 });
    expect(db.createCallRoom).toHaveBeenCalledWith({ groupId: 7, hostId: 1, type: "video" });
    expect(db.joinCallRoom).not.toHaveBeenCalled();
  });
  it("rejects nonmember create/discovery before helpers", async () => {
    vi.mocked(db.isGroupMember).mockResolvedValue(false);
    await expect(caller().createRoom({ groupId: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().activeForGroup({ groupId: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.createCallRoom).not.toHaveBeenCalled();
    expect(db.getActiveCallRoomForGroup).not.toHaveBeenCalled();
  });
  it("discovery returns the room directly or null", async () => {
    expect(await caller().activeForGroup({ groupId: 7 })).toEqual(room);
    expect(db.getActiveCallRoomForGroup).toHaveBeenCalledWith(7, 1);
    vi.mocked(db.getActiveCallRoomForGroup).mockResolvedValue(null);
    expect(await caller().activeForGroup({ groupId: 7 })).toBeNull();
  });
  it("allows prejoin reads with only id/name/avatar and no autojoin", async () => {
    const result = await caller(3).getRoom({ roomId: 42 });
    expect(result.room).toEqual(room);
    expect(result.participants[0].user).toEqual({ id: 1, name: "Person 1", avatar: "/avatar-1" });
    expect(Object.keys(result.participants[0].user).sort()).toEqual(["avatar", "id", "name"]);
    expect(JSON.stringify(result)).not.toContain("SECRET_");
    expect(db.getCallRoom).toHaveBeenCalledWith(42, 3);
    expect(db.getActiveCallParticipants).toHaveBeenCalledWith(42, 3);
    expect(db.joinCallRoom).not.toHaveBeenCalled();
  });
  it.each(["getRoom", "join", "pollSignals"] as const)("removed/nonmembers cannot %s", async method => {
    vi.mocked(db.isGroupMember).mockResolvedValue(false);
    await expect(caller(3)[method]({ roomId: 42 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.joinCallRoom).not.toHaveBeenCalled();
    expect(db.getUnconsumedSignals).not.toHaveBeenCalled();
  });
  it.each(["getRoom", "join", "pollSignals"] as const)("nongroup nonhosts cannot %s", async method => {
    vi.mocked(db.getCallRoom).mockResolvedValue({ ...room, groupId: null });
    await expect(caller(2)[method]({ roomId: 42 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("nongroup host may read before joining", async () => {
    vi.mocked(db.getCallRoom).mockResolvedValue({ ...room, groupId: null, status: "waiting" });
    vi.mocked(db.getActiveCallParticipants).mockResolvedValue([]);
    expect((await caller().getRoom({ roomId: 42 })).participants).toEqual([]);
  });
  it("rejects a fifth person but allows idempotent Join in a full room", async () => {
    vi.mocked(db.getActiveCallParticipants).mockResolvedValue([1, 2, 3, 4].map(participant));
    await expect(caller(5).join({ roomId: 42 })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(db.joinCallRoom).not.toHaveBeenCalled();
    expect(await caller(1).join({ roomId: 42 })).toEqual({ success: true });
    expect(db.joinCallRoom).toHaveBeenCalledWith(42, 1);
  });
  it("counts distinct users rather than legacy duplicate rows", async () => {
    vi.mocked(db.getActiveCallParticipants).mockResolvedValue([1, 1, 1, 2].map(participant));
    expect(await caller(3).join({ roomId: 42 })).toEqual({ success: true });
  });
  it.each([true, false])("denies a block in either direction (%s)", async outbound => {
    vi.mocked(db.isUserBlocked).mockImplementation(async (a, b) => outbound ? a === 3 && b === 1 : a === 1 && b === 3);
    await expect(caller(3).join({ roomId: 42 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.joinCallRoom).not.toHaveBeenCalled();
  });
  it("ended and missing rooms cannot join", async () => {
    vi.mocked(db.getCallRoom).mockResolvedValueOnce({ ...room, status: "ended" });
    await expect(caller().join({ roomId: 42 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().join({ roomId: 999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.joinCallRoom).not.toHaveBeenCalled();
  });
  it("leave delegates only the authenticated user's own id, repeatedly", async () => {
    expect(await caller(2).leave({ roomId: 42 })).toEqual({ success: true });
    expect(await caller(2).leave({ roomId: 42 })).toEqual({ success: true });
    expect(db.leaveCallRoom).toHaveBeenNthCalledWith(1, 42, 2);
    expect(db.leaveCallRoom).toHaveBeenNthCalledWith(2, 42, 2);
  });
  it("forwards capacity/ownership errors from authoritative durable admission", async () => {
    const { TRPCError } = await import("@trpc/server");
    vi.mocked(db.joinCallRoom).mockRejectedValue(new TRPCError({ code: "CONFLICT", message: "full" }));
    await expect(caller(3).join({ roomId: 42 })).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it.each([0, -1, 1.5, Infinity, NaN])("rejects invalid room/group/user ids: %s", async id => {
    await expect(caller().getRoom({ roomId: id })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().createRoom({ groupId: id })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().sendSignal({ ...offer, toUserId: id })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("group call signaling", () => {
  it("forwards valid JSON descriptions only after same-room active checks", async () => {
    expect(await caller().sendSignal(offer)).toEqual({ success: true });
    expect(db.sendCallSignal).toHaveBeenCalledWith({ ...offer, fromUserId: 1 });
  });
  it.each([1, 2])("denies absent sender/recipient %i", async absentId => {
    vi.mocked(db.getActiveCallParticipants).mockResolvedValue([participant(absentId === 1 ? 2 : 1)]);
    await expect(caller().sendSignal(offer)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.sendCallSignal).not.toHaveBeenCalled();
  });
  it("denies a removed recipient and self signaling", async () => {
    vi.mocked(db.isGroupMember).mockImplementation(async (_, id) => id !== 2);
    await expect(caller().sendSignal(offer)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().sendSignal({ ...offer, toUserId: 1 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("poll rejects a prejoin reader but keeps signals wrapper for a participant", async () => {
    await expect(caller(3).pollSignals({ roomId: 42 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getUnconsumedSignals).not.toHaveBeenCalled();
    expect(await caller().pollSignals({ roomId: 42 })).toEqual({ signals: [] });
    expect(db.getUnconsumedSignals).toHaveBeenCalledWith(42, 1);
  });
  it.each([
    { type: "bogus", payload: "{}" }, { type: "offer", payload: "not-json" },
    { type: "offer", payload: "null" }, { type: "offer", payload: "[]" },
    { type: "offer", payload: JSON.stringify({ type: "answer", sdp: "v=0" }) },
    { type: "offer", payload: JSON.stringify({ type: "offer", sdp: "" }) },
    { type: "offer", payload: JSON.stringify({ type: "offer", sdp: "v=0", extra: "no" }) },
    { type: "ice-candidate", payload: JSON.stringify({ candidate: 123 }) },
    { type: "ice-candidate", payload: JSON.stringify({ candidate: "candidate:x", sdpMLineIndex: -1 }) },
    { type: "ice-candidate", payload: JSON.stringify({ candidate: "x".repeat(65536) }) },
    { type: "ice-candidate", payload: JSON.stringify({ candidate: "é".repeat(40000) }) },
  ])("rejects malformed/bounded $type payload", async input => {
    await expect(caller().sendSignal({ ...offer, ...input } as typeof offer)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.sendCallSignal).not.toHaveBeenCalled();
  });
  it("accepts actual browser candidate shape, empty candidate end-marker, and answers", () => {
    expect(validGroupCallSignalPayload("ice-candidate", JSON.stringify({ candidate: "candidate:x", sdpMid: "0", sdpMLineIndex: 0, usernameFragment: "foo" }))).toBe(true);
    expect(validGroupCallSignalPayload("ice-candidate", JSON.stringify({ candidate: "", sdpMid: null, sdpMLineIndex: null }))).toBe(true);
    expect(groupCallSignalInputSchema.safeParse({ ...offer, type: "answer", payload: JSON.stringify({ type: "answer", sdp: "v=0" }) }).success).toBe(true);
  });
});
