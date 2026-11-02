import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
  isUserBlocked: vi.fn(),
  areFriends: vi.fn(),
  getFriendRequestBetween: vi.fn(),
  sendFriendRequest: vi.fn(),
  createNotification: vi.fn(),
  getOwnerMemberCard: vi.fn(),
  getSharedMemberCard: vi.fn(),
  saveOwnerMemberCard: vi.fn(),
  replaceMemberCardLink: vi.fn(),
}));
vi.mock("./db", () => ({
  getUserById: mocks.getUserById,
  isUserBlocked: mocks.isUserBlocked,
  areFriends: mocks.areFriends,
  getFriendRequestBetween: mocks.getFriendRequestBetween,
  sendFriendRequest: mocks.sendFriendRequest,
  createNotification: mocks.createNotification,
}));
vi.mock("./memberCardStore", () => ({
  getOwnerMemberCard: mocks.getOwnerMemberCard,
  getSharedMemberCard: mocks.getSharedMemberCard,
  saveOwnerMemberCard: mocks.saveOwnerMemberCard,
  replaceMemberCardLink: mocks.replaceMemberCardLink,
}));
import { memberCardsRouter } from "./memberCardsRouter";
const linkId = "a".repeat(48);
const record = {
  userId: 42,
  memberNumber: "FF-AB1234567890CDEF",
  shareToken: linkId,
  enabled: true,
  showName: true,
  showPhoto: false,
  appearance: "classic" as const,
};
const owner = {
  id: 42,
  name: "Member Forty Two",
  avatar: "/media/photo.jpg",
  suspendedUntil: null,
  email: "secret@example.test",
  passwordHash: "secret-hash",
  phone: "secret-phone",
  openId: "secret-open-id",
};
let nextIp = 0;
function caller(id: number | null) {
  return memberCardsRouter.createCaller({
    user: id === null ? null : { ...owner, id },
    req: { ip: `fixture-${++nextIp}`, socket: { remoteAddress: "fixture" } },
    res: { setHeader: vi.fn() },
  } as unknown as TrpcContext);
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserById.mockResolvedValue(owner);
  mocks.getOwnerMemberCard.mockResolvedValue(null);
  mocks.getSharedMemberCard.mockResolvedValue(record);
  mocks.saveOwnerMemberCard.mockResolvedValue(record);
  mocks.replaceMemberCardLink.mockResolvedValue(record);
  mocks.isUserBlocked.mockResolvedValue(false);
  mocks.areFriends.mockResolvedValue(false);
  mocks.getFriendRequestBetween.mockResolvedValue(null);
});
describe("member-card API access and opt-in", () => {
  it("requires login for owner management", async () => {
    await expect(caller(null).mine()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mocks.getOwnerMemberCard).not.toHaveBeenCalled();
  });
  it("keeps first-use defaults private without inserting cards", async () => {
    const result = await caller(42).mine();
    expect(result.settings.enabled).toBe(false);
    expect(result.card.sharePath).toBeNull();
    expect(mocks.saveOwnerMemberCard).not.toHaveBeenCalled();
  });
  it("saves only the authenticated owner's settings", async () => {
    await caller(42).save({
      enabled: true,
      showName: true,
      showPhoto: false,
      appearance: "classic",
    });
    expect(mocks.saveOwnerMemberCard).toHaveBeenCalledWith(42, {
      enabled: true,
      showName: true,
      showPhoto: false,
      appearance: "classic",
    });
  });
  it("rejects attempts to choose someone else's account ID", async () => {
    await expect(
      caller(42).save({
        enabled: true,
        showName: true,
        showPhoto: false,
        appearance: "classic",
        userId: 99,
      } as any)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.saveOwnerMemberCard).not.toHaveBeenCalled();
  });
  it("replaces only the signed-in owner's link", async () => {
    await caller(42).replaceLink();
    expect(mocks.replaceMemberCardLink).toHaveBeenCalledWith(42);
  });
  it("requires login to replace a link", async () => {
    await expect(caller(null).replaceLink()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
  it("does not allow suspended accounts to enable sharing", async () => {
    mocks.getUserById.mockResolvedValue({
      ...owner,
      suspendedUntil: new Date(Date.now() + 60_000),
    });
    await expect(
      caller(42).save({
        enabled: true,
        showName: true,
        showPhoto: false,
        appearance: "classic",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("permits anonymous viewing of only selected public card data", async () => {
    const result = await caller(null).shared({ linkId });
    expect(result?.card.displayName).toBe("Member Forty Two");
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(mocks.sendFriendRequest).not.toHaveBeenCalled();
  });
  it("rejects malformed QR locators before reading the database", async () => {
    await expect(
      caller(null).shared({ linkId: "../../users" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.getSharedMemberCard).not.toHaveBeenCalled();
  });
  it("returns the same unavailable response for disabled or replaced links", async () => {
    mocks.getSharedMemberCard.mockResolvedValue(null);
    expect(await caller(null).shared({ linkId })).toBeNull();
  });
  it("denies signed-in viewers blocked in either direction", async () => {
    mocks.isUserBlocked
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    expect(await caller(7).shared({ linkId })).toBeNull();
    expect(mocks.isUserBlocked).toHaveBeenCalledWith(42, 7);
  });
  it("does not bypass an owner's block", async () => {
    mocks.isUserBlocked.mockResolvedValue(true);
    expect(await caller(8).shared({ linkId })).toBeNull();
  });
  it("hides suspended and deleted account cards from visitors", async () => {
    mocks.getUserById.mockResolvedValue(undefined);
    expect(await caller(null).shared({ linkId })).toBeNull();
    mocks.getUserById.mockResolvedValue({
      ...owner,
      suspendedUntil: new Date(Date.now() + 60_000),
    });
    expect(await caller(null).shared({ linkId })).toBeNull();
  });
  it("requires a signed-in deliberate connection action", async () => {
    await expect(caller(null).connect({ linkId })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mocks.sendFriendRequest).not.toHaveBeenCalled();
  });
  it("rechecks blocks at the moment of a connection request", async () => {
    mocks.isUserBlocked.mockResolvedValue(true);
    await expect(caller(9).connect({ linkId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(mocks.sendFriendRequest).not.toHaveBeenCalled();
  });
  it("does not create a duplicate request for existing friends", async () => {
    mocks.areFriends.mockResolvedValue(true);
    expect(await caller(10).connect({ linkId })).toEqual({ status: "friends" });
    expect(mocks.sendFriendRequest).not.toHaveBeenCalled();
  });
  it("does not create a duplicate pending request", async () => {
    mocks.getFriendRequestBetween.mockResolvedValue({ status: "pending" });
    expect(await caller(11).connect({ linkId })).toEqual({ status: "pending" });
    expect(mocks.sendFriendRequest).not.toHaveBeenCalled();
  });
  it("creates a standard friend request but does not auto-accept", async () => {
    expect(await caller(12).connect({ linkId })).toEqual({ status: "sent" });
    expect(mocks.sendFriendRequest).toHaveBeenCalledWith(12, 42);
    expect(mocks.createNotification).toHaveBeenCalledWith({
      userId: 42,
      actorId: 12,
      type: "friend_request",
    });
  });
  it("does not allow connecting to your own card", async () => {
    await expect(caller(42).connect({ linkId })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});
