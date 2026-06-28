import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getConversationsForUser: vi.fn().mockResolvedValue([
      { id: 1, otherUser: { id: 2, name: "Bob" }, lastMessageAt: new Date() },
      { id: 2, otherUser: { id: 3, name: "Carol" }, lastMessageAt: new Date() },
    ]),
    getMessages: vi.fn().mockResolvedValue([
      {
        id: 10, conversationId: 1, senderId: 1, text: "Hello!",
        fileUrl: null, fileType: null, fileName: null, fileSize: null,
        deletedAt: null, createdAt: new Date(),
      },
    ]),
    sendMessage: vi.fn().mockResolvedValue({ id: 99 }),
    getOrCreateConversation: vi.fn().mockResolvedValue({ id: 2 }),
    markMessagesAsRead: vi.fn().mockResolvedValue(undefined),
    getUserById: vi.fn().mockResolvedValue({ id: 1, name: "Alice" }),
    getMessageReactions: vi.fn().mockResolvedValue([]),
    addMessageReaction: vi.fn().mockResolvedValue(undefined),
    removeMessageReaction: vi.fn().mockResolvedValue(undefined),
    deleteMessage: vi.fn().mockResolvedValue(undefined),
    updateUserLastSeen: vi.fn().mockResolvedValue(undefined),
    getUserLastSeen: vi.fn().mockResolvedValue(null),
    forwardMessage: vi.fn().mockResolvedValue({ id: 100 }),
  };
});

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: "dm-voice/1/123.webm",
    url: "/manus-storage/dm-voice/1/123.webm",
  }),
}));

const makeCtx = (userId: number): TrpcContext =>
  ({
    user: { id: userId, name: "Alice", email: "alice@test.com", role: "user" },
    req: {} as any,
    res: {} as any,
  } as TrpcContext);

// ── dm.forward ────────────────────────────────────────────────────────────────
describe("dm.forward", () => {
  it("forwards a message to another conversation and returns success + messageId", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.dm.forward({ messageId: 10, toConversationId: 2 });
    expect(result).toMatchObject({ success: true, messageId: 100 });
  });

  it("throws FORBIDDEN when user is not a participant of the target conversation", async () => {
    const db = await import("./db");
    (db.getConversationsForUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: 1, otherUser: { id: 2, name: "Bob" }, lastMessageAt: new Date() },
    ]);
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(
      caller.dm.forward({ messageId: 10, toConversationId: 2 })
    ).rejects.toThrow();
  });

  it("throws NOT_FOUND when forwardMessage returns null", async () => {
    const db = await import("./db");
    (db.forwardMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(
      caller.dm.forward({ messageId: 999, toConversationId: 2 })
    ).rejects.toThrow();
  });
});

// ── dm.uploadVoice ────────────────────────────────────────────────────────────
describe("dm.uploadVoice", () => {
  it("uploads a voice message and returns url + messageId", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    const audioBase64 = Buffer.from("fake-audio-data").toString("base64");
    const result = await caller.dm.uploadVoice({
      conversationId: 1,
      audioBase64,
      durationSeconds: 3,
    });
    expect(result).toMatchObject({
      url: "/manus-storage/dm-voice/1/123.webm",
      messageId: 99,
    });
  });

  it("throws BAD_REQUEST when audio exceeds 5 MB", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    const bigBase64 = Buffer.alloc(6 * 1024 * 1024).toString("base64");
    await expect(
      caller.dm.uploadVoice({ conversationId: 1, audioBase64: bigBase64, durationSeconds: 1 })
    ).rejects.toThrow();
  });

  it("throws BAD_REQUEST when durationSeconds is 0", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    const audioBase64 = Buffer.from("tiny").toString("base64");
    await expect(
      caller.dm.uploadVoice({ conversationId: 1, audioBase64, durationSeconds: 0 })
    ).rejects.toThrow();
  });
});
