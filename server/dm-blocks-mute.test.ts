import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock all db helpers used by the blocks and dm-mute procedures
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    // blocks helpers
    blockUser: vi.fn().mockResolvedValue(undefined),
    unblockUser: vi.fn().mockResolvedValue(undefined),
    getBlockedUsers: vi.fn().mockResolvedValue([
      { id: 1, blockedId: 2, createdAt: new Date(), blockedUser: { name: "Bob", avatar: null } },
    ]),
    isUserBlocked: vi.fn().mockResolvedValue(false),
    // dm mute helpers
    muteDmConversation: vi.fn().mockResolvedValue(undefined),
    getDmMuteStatus: vi.fn().mockResolvedValue(null),
    // stubs for other dm procedures used by the router
    getConversationsForUser: vi.fn().mockResolvedValue([
      { id: 1, otherUser: { id: 2, name: "Bob" }, lastMessageAt: new Date() },
    ]),
    getMessages: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue({ id: 99 }),
    getOrCreateConversation: vi.fn().mockResolvedValue({ id: 1 }),
    markMessagesAsRead: vi.fn().mockResolvedValue(undefined),
    getUserById: vi.fn().mockResolvedValue({ id: 1, name: "Alice" }),
    getMessageReactions: vi.fn().mockResolvedValue([]),
  };
});

const makeCtx = (userId: number): TrpcContext =>
  ({
    user: { id: userId, name: "Alice", email: "alice@test.com", role: "user" },
    req: {} as any,
    res: {} as any,
  } as TrpcContext);

// ─── blocks.block ─────────────────────────────────────────────────────────────
describe("blocks.block", () => {
  it("blocks another user and returns success", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.blocks.block({ blockedId: 2 });
    expect(result).toEqual({ success: true });
  });

  it("throws BAD_REQUEST when trying to block yourself", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(caller.blocks.block({ blockedId: 1 })).rejects.toThrow("Cannot block yourself");
  });
});

// ─── blocks.unblock ───────────────────────────────────────────────────────────
describe("blocks.unblock", () => {
  it("unblocks a user and returns success", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.blocks.unblock({ blockedId: 2 });
    expect(result).toEqual({ success: true });
  });
});

// ─── blocks.list ──────────────────────────────────────────────────────────────
describe("blocks.list", () => {
  it("returns the list of blocked users", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.blocks.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toMatchObject({ blockedId: 2 });
  });
});

// ─── blocks.check ─────────────────────────────────────────────────────────────
describe("blocks.check", () => {
  it("returns iBlocked=false and theyBlocked=false when no block exists", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.blocks.check({ userId: 2 });
    expect(result.iBlocked).toBe(false);
    expect(result.theyBlocked).toBe(false);
    expect(result.isBlocked).toBe(false);
  });

  it("returns iBlocked=true when current user has blocked the target", async () => {
    const { isUserBlocked } = await import("./db");
    vi.mocked(isUserBlocked).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.blocks.check({ userId: 2 });
    expect(result.iBlocked).toBe(true);
    expect(result.isBlocked).toBe(true);
  });

  it("returns theyBlocked=true when target has blocked the current user", async () => {
    const { isUserBlocked } = await import("./db");
    vi.mocked(isUserBlocked).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.blocks.check({ userId: 2 });
    expect(result.theyBlocked).toBe(true);
    expect(result.isBlocked).toBe(true);
  });
});

// ─── dm.muteDm ────────────────────────────────────────────────────────────────
describe("dm.muteDm", () => {
  it("mutes a DM conversation and returns success", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.dm.muteDm({
      conversationId: 1,
      mutedUntil: Date.now() + 8 * 3600000,
    });
    expect(result).toEqual({ success: true });
  });

  it("unmutes a DM conversation when mutedUntil is null", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.dm.muteDm({ conversationId: 1, mutedUntil: null });
    expect(result).toEqual({ success: true });
  });
});

// ─── dm.getDmMuteStatus ───────────────────────────────────────────────────────
describe("dm.getDmMuteStatus", () => {
  it("returns mutedUntil=null when conversation is not muted", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.dm.getDmMuteStatus({ conversationId: 1 });
    expect(result.mutedUntil).toBeNull();
  });

  it("returns a timestamp when conversation is muted", async () => {
    const { getDmMuteStatus } = await import("./db");
    const futureDate = new Date(Date.now() + 3600000);
    vi.mocked(getDmMuteStatus).mockResolvedValueOnce(futureDate);
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.dm.getDmMuteStatus({ conversationId: 1 });
    expect(result.mutedUntil).toBe(futureDate.getTime());
  });
});
