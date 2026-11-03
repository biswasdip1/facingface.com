import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { GROUP_CALL_WAITING_MS } from "../shared/groupCall";
const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(), areFriends: vi.fn(), isUserBlocked: vi.fn(),
  createCallRoom: vi.fn(), getCallRoom: vi.fn(), getOrCreateConversation: vi.fn(), sendMessage: vi.fn(),
  createPrivateInvitationGroup: vi.fn(), hasLegitimateDirectConversation: vi.fn(), requireCallInvitationDatabase: vi.fn(),
  emitDirectMessageRefresh: vi.fn(), emitGroupCallInvitation: vi.fn(),
}));
vi.mock("./db", () => mocks);
vi.mock("./callInvitesStore", () => mocks);
vi.mock("./callSignaling", () => mocks);
import { callInvitesRouter, callInviteStartLimiter, groupCallInvitationUrl } from "./callInvitesRouter";
const input = { peerId: 2, inviteeIds: [3], type: "video" as const };
let startedAt: Date;
function caller(userId: number | null = 1) {
  return callInvitesRouter.createCaller({
    user: userId === null ? null : { id: userId, name: "Forged context name" },
    req: { headers: { origin: "https://attacker.invalid", host: "attacker.invalid" } }, res: {},
  } as TrpcContext);
}
function assertNoWrites() {
  expect(mocks.createPrivateInvitationGroup).not.toHaveBeenCalled();
  expect(mocks.createCallRoom).not.toHaveBeenCalled();
  expect(mocks.getOrCreateConversation).not.toHaveBeenCalled();
  expect(mocks.sendMessage).not.toHaveBeenCalled();
  expect(mocks.emitGroupCallInvitation).not.toHaveBeenCalled();
}
beforeEach(() => {
  vi.resetAllMocks();
  callInviteStartLimiter._store.clear();
  vi.stubEnv("CHAT_ENCRYPTION_KEY", "test-chat-encryption-key-at-least-16");
  vi.stubEnv("PUBLIC_APP_URL", "https://www.facingface.com");
  startedAt = new Date();
  mocks.getUserById.mockImplementation(async id => ({ id, name: `Person ${id}`, suspendedUntil: null }));
  mocks.areFriends.mockResolvedValue(true);
  mocks.isUserBlocked.mockResolvedValue(false);
  mocks.requireCallInvitationDatabase.mockResolvedValue({});
  mocks.hasLegitimateDirectConversation.mockResolvedValue(false);
  mocks.createPrivateInvitationGroup.mockResolvedValue(71);
  mocks.createCallRoom.mockResolvedValue(42);
  mocks.getCallRoom.mockResolvedValue({ id: 42, groupId: 71, hostId: 1, type: "video", status: "waiting", startedAt });
  mocks.getOrCreateConversation.mockImplementation(async (ownerId, recipientId) => ({ id: 100 + recipientId, participant1Id: ownerId, participant2Id: recipientId }));
  mocks.sendMessage.mockResolvedValue({ id: 201 });
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); callInviteStartLimiter._store.clear(); });

describe("callInvites.start authorization and selection", () => {
  it("requires authentication before reading or writing", async () => {
    await expect(caller(null).start(input)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.getUserById).not.toHaveBeenCalled();
    assertNoWrites();
  });
  it.each([
    { ...input, peerId: 0 }, { ...input, peerId: -1 }, { ...input, peerId: 1.5 },
    { ...input, inviteeIds: [] }, { ...input, inviteeIds: [3, 4, 5] },
    { ...input, inviteeIds: [0] }, { ...input, inviteeIds: [-1] },
    { ...input, inviteeIds: [3.5] }, { ...input, inviteeIds: [3, 3] },
    { ...input, inviteeIds: [2] }, { ...input, peerId: 1 }, { ...input, inviteeIds: [1] },
    { ...input, type: "bogus" }, { ...input, groupId: 999 }, { ...input, fromId: 999 },
    { ...input, url: "https://attacker.invalid" },
  ])("rejects invalid/self/duplicate/peer selections and forged fields: %j", async value => {
    await expect(caller().start(value as typeof input)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    assertNoWrites();
  });
  it.each([1, 2, 3, 4])("validates every selected user's existence before any writes (%i)", async missing => {
    mocks.getUserById.mockImplementation(async id => id === missing ? undefined : ({ id, suspendedUntil: null }));
    await expect(caller().start({ ...input, inviteeIds: [3, 4] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.getUserById.mock.calls.map(([id]) => id)).toEqual([1, 2, 3, 4]);
    assertNoWrites();
  });
  it.each([1, 2, 3, 4])("denies a currently suspended member (%i)", async suspended => {
    mocks.getUserById.mockImplementation(async id => ({ id, suspendedUntil: id === suspended ? new Date(Date.now() + 60_000) : null }));
    await expect(caller().start({ ...input, inviteeIds: [3, 4] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    assertNoWrites();
  });
  it("allows an expired suspension", async () => {
    mocks.getUserById.mockImplementation(async id => ({ id, suspendedUntil: new Date(Date.now() - 1000) }));
    await expect(caller().start(input)).resolves.toMatchObject({ roomId: 42 });
  });
  it.each([[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [2, 4], [4, 2], [3, 4], [4, 3]])("denies every pairwise block in either direction (%i -> %i)", async (blocker, blocked) => {
    mocks.isUserBlocked.mockImplementation(async (first, second) => first === blocker && second === blocked);
    await expect(caller().start({ ...input, inviteeIds: [3, 4] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    assertNoWrites();
  });
  it("rejects an unknown peer without manufacturing a conversation", async () => {
    mocks.areFriends.mockImplementation(async (_, id) => id !== 2);
    await expect(caller().start(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.hasLegitimateDirectConversation).toHaveBeenCalledWith(1, 2);
    assertNoWrites();
  });
  it("allows a legitimate existing nonfriend peer but still requires invitee friendship", async () => {
    mocks.areFriends.mockImplementation(async (_, id) => id !== 2);
    mocks.hasLegitimateDirectConversation.mockResolvedValue(true);
    await expect(caller().start(input)).resolves.toMatchObject({ invitedUserIds: [2, 3] });
    expect(mocks.hasLegitimateDirectConversation).toHaveBeenCalledWith(1, 2);
  });
  it.each([3, 4])("rejects a nonaccepted invitee even with a legitimate DM (%i)", async stranger => {
    mocks.areFriends.mockImplementation(async (_, id) => id !== stranger);
    mocks.hasLegitimateDirectConversation.mockResolvedValue(true);
    await expect(caller().start({ ...input, inviteeIds: [3, 4] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    assertNoWrites();
  });
  it("binds group ownership, call host, DM sender and invitation identity to the authenticated user", async () => {
    mocks.getCallRoom.mockResolvedValue({ id: 42, groupId: 71, hostId: 9, type: "video", status: "waiting", startedAt });
    const result = await caller(9).start(input);
    expect(mocks.createPrivateInvitationGroup).toHaveBeenCalledWith(9, [2, 3]);
    expect(mocks.createCallRoom).toHaveBeenCalledWith({ groupId: 71, hostId: 9, type: "video" });
    expect(mocks.sendMessage.mock.calls.every(([message]) => message.senderId === 9)).toBe(true);
    expect(mocks.emitGroupCallInvitation).toHaveBeenCalledWith([2, 3], expect.objectContaining({ fromId: 9, fromName: "Person 9" }));
    expect(result.invitedUserIds).not.toContain(9);
  });
});

describe("callInvites.start durable delivery", () => {
  it("creates a fresh 4-person group, saves all messages, then emits targeted prompts with the exact durable deadline", async () => {
    const order: string[] = [];
    mocks.createPrivateInvitationGroup.mockImplementation(async () => { order.push("group"); return 71; });
    mocks.createCallRoom.mockImplementation(async () => { order.push("room"); return 42; });
    mocks.sendMessage.mockImplementation(async ({ conversationId }) => { order.push(`save:${conversationId}`); return { id: 201 }; });
    mocks.emitDirectMessageRefresh.mockImplementation(() => order.push("refresh"));
    mocks.emitGroupCallInvitation.mockImplementation(() => order.push("invite"));
    const result = await caller().start({ ...input, inviteeIds: [3, 4] });
    const expiresAt = startedAt.getTime() + GROUP_CALL_WAITING_MS;
    expect(result).toEqual({ roomId: 42, groupId: 71, invitedUserIds: [2, 3, 4], expiresAt });
    expect(mocks.createPrivateInvitationGroup).toHaveBeenCalledWith(1, [2, 3, 4]);
    expect(order).toEqual(["group", "room", "save:102", "save:103", "save:104", "refresh", "refresh", "refresh", "invite"]);
    expect(mocks.emitGroupCallInvitation).toHaveBeenCalledWith([2, 3, 4], { roomId: 42, groupId: 71, fromId: 1, fromName: "Person 1", type: "video", expiresAt });
    expect(mocks.getCallRoom).toHaveBeenCalledWith(42, 1);
    expect(mocks.sendMessage).toHaveBeenCalledTimes(3);
    for (let recipient = 2; recipient <= 4; recipient++) {
      expect(mocks.emitDirectMessageRefresh).toHaveBeenCalledWith([1, recipient], 100 + recipient);
    }
    expect(mocks.sendMessage.mock.calls[0][0].text).toContain("https://www.facingface.com/calls/group/42");
    expect(mocks.sendMessage.mock.calls[0][0].text).toContain(new Date(expiresAt).toISOString());
    expect(mocks.sendMessage.mock.calls[0][0].text).not.toContain("attacker.invalid");
  });
  it("keeps a fixed text prefix so display names cannot bypass existing encryption", async () => {
    mocks.getUserById.mockImplementation(async id => ({ id, name: "ffenc:v1:crafted-display-name", suspendedUntil: null }));
    await caller().start(input);
    const text = mocks.sendMessage.mock.calls[0][0].text;
    expect(text).toMatch(/^Group video call invitation from /);
    expect(text).not.toMatch(/^ffenc:v1:/);
  });
  it("does not notify or write DMs for an already-expired waiting room", async () => {
    mocks.getCallRoom.mockResolvedValue({ id: 42, groupId: 71, hostId: 1, type: "video", status: "waiting", startedAt: new Date(Date.now() - GROUP_CALL_WAITING_MS - 1) });
    await expect(caller().start(input)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(mocks.getOrCreateConversation).not.toHaveBeenCalled();
    expect(mocks.sendMessage).not.toHaveBeenCalled();
    expect(mocks.emitGroupCallInvitation).not.toHaveBeenCalled();
  });
  it("does not report successful live delivery if saving messages consumes the deadline", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    mocks.sendMessage.mockImplementation(async () => { vi.setSystemTime(startedAt.getTime() + GROUP_CALL_WAITING_MS + 1); return { id: 201 }; });
    await expect(caller().start(input)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(mocks.emitGroupCallInvitation).not.toHaveBeenCalled();
  });
  it("fails before creation when storage is unavailable", async () => {
    mocks.requireCallInvitationDatabase.mockRejectedValue(new Error("database unavailable"));
    await expect(caller().start(input)).rejects.toThrow("database unavailable");
    assertNoWrites();
  });
  it("supports audio without autojoin or media operations", async () => {
    mocks.getCallRoom.mockResolvedValue({ id: 42, groupId: 71, hostId: 1, type: "audio", status: "waiting", startedAt });
    await caller().start({ ...input, type: "audio" });
    expect(mocks.createCallRoom).toHaveBeenCalledWith({ groupId: 71, hostId: 1, type: "audio" });
    expect(mocks.emitGroupCallInvitation.mock.calls[0][1].type).toBe("audio");
  });
  it("caps starts at two per minute per owner and resets on the next window", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    await caller().start(input);
    await caller().start(input);
    await expect(caller().start(input)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(mocks.createPrivateInvitationGroup).toHaveBeenCalledTimes(2);
    vi.setSystemTime(Date.now() + 60_001);
    await expect(caller().start(input)).resolves.toMatchObject({ roomId: 42 });
  });
  it("another owner does not inherit the first owner's rate limit", async () => {
    await caller().start(input); await caller().start(input);
    mocks.getCallRoom.mockResolvedValue({ id: 42, groupId: 71, hostId: 8, type: "video", status: "waiting", startedAt });
    await expect(caller(8).start(input)).resolves.toMatchObject({ roomId: 42 });
  });
  it("fails closed before writes if encryption is not configured", async () => {
    vi.stubEnv("CHAT_ENCRYPTION_KEY", ""); vi.stubEnv("JWT_SECRET", ""); vi.stubEnv("SESSION_SECRET", "short");
    await expect(caller().start(input)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    assertNoWrites();
  });
  it.each(["createPrivateInvitationGroup", "createCallRoom", "getCallRoom", "getOrCreateConversation", "sendMessage"] as const)("honestly reports a failure at %s without a success prompt", async name => {
    mocks[name].mockRejectedValue(new Error("test failure"));
    await expect(caller().start(input)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR", message: expect.stringContaining("current call has not been changed") });
    expect(mocks.emitGroupCallInvitation).not.toHaveBeenCalled();
    expect(mocks.emitDirectMessageRefresh).not.toHaveBeenCalled();
  });
  it("does not emit any call prompt if a later recipient's message fails", async () => {
    mocks.sendMessage.mockResolvedValueOnce({ id: 201 }).mockRejectedValueOnce(new Error("second message failed"));
    await expect(caller().start(input)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(mocks.sendMessage).toHaveBeenCalledTimes(2);
    expect(mocks.emitGroupCallInvitation).not.toHaveBeenCalled();
  });
  it.each([
    { id: 0, participant1Id: 1, participant2Id: 2 },
    { id: 102, participant1Id: 8, participant2Id: 2 },
    { id: 102, participant1Id: 1, participant2Id: 8 },
  ])("never saves an invitation in an unauthorized conversation %j", async conversation => {
    mocks.getOrCreateConversation.mockResolvedValueOnce(conversation);
    await expect(caller().start(input)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(mocks.sendMessage).not.toHaveBeenCalled();
    expect(mocks.emitGroupCallInvitation).not.toHaveBeenCalled();
  });
  it.each([0, -1, undefined])("requires a positive saved message id %s", async id => {
    mocks.sendMessage.mockResolvedValueOnce({ id });
    await expect(caller().start(input)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(mocks.emitGroupCallInvitation).not.toHaveBeenCalled();
  });
  it.each([{ groupId: 9 }, { hostId: 9 }, { status: "ended" }, { type: "audio" }])("rejects an unexpected room before sending any invitation %j", async change => {
    mocks.getCallRoom.mockResolvedValue({ id: 42, groupId: 71, hostId: 1, type: "video", status: "waiting", startedAt, ...change });
    await expect(caller().start(input)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });
});

describe("invitation URLs are server-owned notification links", () => {
  it("uses PUBLIC_APP_URL's HTTPS origin, never its path/query/fragment", () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://app.facingface.example/base?evil=1#fragment");
    expect(groupCallInvitationUrl(42)).toBe("https://app.facingface.example/calls/group/42");
  });
  it.each(["", "not-a-url", "http://insecure.example", "javascript:alert(1)", "https://secret:password@example.com"]) ("falls back to the canonical HTTPS origin for invalid/untrustworthy config %s", value => {
    vi.stubEnv("PUBLIC_APP_URL", value);
    expect(groupCallInvitationUrl(42)).toBe("https://www.facingface.com/calls/group/42");
  });
});
