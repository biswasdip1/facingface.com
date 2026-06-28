import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock all db helpers used by the dm router
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getConversationsForUser: vi.fn().mockResolvedValue([
      { id: 1, otherUser: { id: 2, name: "Bob" }, lastMessageAt: new Date() },
    ]),
    getMessageReactions: vi.fn().mockResolvedValue([
      { messageId: 10, userId: 2, emoji: "❤️", createdAt: new Date() },
    ]),
    addMessageReaction: vi.fn().mockResolvedValue({ messageId: 10, userId: 1, emoji: "👍", createdAt: new Date() }),
    removeMessageReaction: vi.fn().mockResolvedValue(undefined),
    // Stubs for other dm procedures
    getMessages: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue({ id: 99 }),
    getOrCreateConversation: vi.fn().mockResolvedValue({ id: 1 }),
    markMessagesAsRead: vi.fn().mockResolvedValue(undefined),
    getUserById: vi.fn().mockResolvedValue({ id: 1, name: "Alice" }),
  };
});

const makeCtx = (userId: number): TrpcContext =>
  ({
    user: { id: userId, name: "Alice", email: "alice@test.com", role: "user" },
    req: {} as any,
    res: {} as any,
  } as TrpcContext);

describe("dm.reactions", () => {
  it("returns reactions for a conversation the user is part of", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.dm.reactions({ conversationId: 1 });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toMatchObject({ messageId: 10, emoji: "❤️" });
  });

  it("throws FORBIDDEN when user is not a participant", async () => {
    const { getConversationsForUser } = await import("./db");
    vi.mocked(getConversationsForUser).mockResolvedValueOnce([]);
    const caller = appRouter.createCaller(makeCtx(99));
    await expect(caller.dm.reactions({ conversationId: 1 })).rejects.toThrow("Not a participant");
  });
});

describe("dm.addReaction", () => {
  it("adds a reaction to a message", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.dm.addReaction({ messageId: 10, emoji: "👍" });
    expect(result).toMatchObject({ messageId: 10, emoji: "👍" });
  });

  it("rejects emoji longer than 10 chars", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(
      caller.dm.addReaction({ messageId: 10, emoji: "12345678901" })
    ).rejects.toThrow();
  });
});

describe("dm.removeReaction", () => {
  it("removes a reaction from a message", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.dm.removeReaction({ messageId: 10 });
    expect(result).toEqual({ success: true });
  });
});
