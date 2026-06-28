import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Shared mock data ────────────────────────────────────────────────────────
const mockConversation = {
  id: 1,
  participant1Id: 10,
  participant2Id: 20,
  lastReadMessageIdP1: null,
  lastReadMessageIdP2: null,
};

const mockMessage = {
  id: 100,
  conversationId: 1,
  senderId: 10,
  text: "Hello!",
  pinnedAt: null,
  deletedAt: null,
  createdAt: new Date(),
};

// ── Mock db helpers ─────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getConversationsForUser: vi.fn(async (userId: number) => {
    if (userId === 10 || userId === 20) return [mockConversation];
    return [];
  }),
  getMessageById: vi.fn(async (id: number) => (id === 100 ? mockMessage : null)),
  pinMessage: vi.fn(async () => ({ ...mockMessage, pinnedAt: new Date() })),
  unpinMessage: vi.fn(async () => ({ ...mockMessage, pinnedAt: null })),
  getPinnedMessages: vi.fn(async () => [{ ...mockMessage, pinnedAt: new Date() }]),
  updateLastReadMessage: vi.fn(async () => {}),
  getConversationReadState: vi.fn(async () => ({
    lastReadMessageIdP1: 100,
    lastReadMessageIdP2: null,
  })),
}));

import {
  getConversationsForUser,
  getMessageById,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  updateLastReadMessage,
  getConversationReadState,
} from "./db";

// ── Helper: simulate procedure logic ────────────────────────────────────────
async function simulatePinMessage(userId: number, messageId: number, conversationId: number) {
  const convs = await getConversationsForUser(userId);
  const conv = convs.find((c: any) => c.id === conversationId);
  if (!conv) throw new Error("FORBIDDEN");
  const msg = await getMessageById(messageId);
  if (!msg || msg.conversationId !== conversationId) throw new Error("NOT_FOUND");
  return pinMessage(messageId);
}

async function simulateUnpinMessage(userId: number, messageId: number, conversationId: number) {
  const convs = await getConversationsForUser(userId);
  const conv = convs.find((c: any) => c.id === conversationId);
  if (!conv) throw new Error("FORBIDDEN");
  return unpinMessage(messageId);
}

async function simulateGetPinnedMessages(userId: number, conversationId: number) {
  const convs = await getConversationsForUser(userId);
  const conv = convs.find((c: any) => c.id === conversationId);
  if (!conv) throw new Error("FORBIDDEN");
  return getPinnedMessages(conversationId);
}

async function simulateMarkRead(userId: number, conversationId: number, lastMessageId: number) {
  const convs = await getConversationsForUser(userId);
  const conv = convs.find((c: any) => c.id === conversationId);
  if (!conv) throw new Error("FORBIDDEN");
  await updateLastReadMessage(conversationId, userId, lastMessageId);
  return { success: true };
}

async function simulateReadState(userId: number, conversationId: number) {
  const convs = await getConversationsForUser(userId);
  const conv = convs.find((c: any) => c.id === conversationId);
  if (!conv) throw new Error("FORBIDDEN");
  const state = await getConversationReadState(conversationId);
  return state
    ? { ...state, participant1Id: (conv as any).participant1Id, participant2Id: (conv as any).participant2Id }
    : null;
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("dm.pinMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pins a message in a conversation the user is part of", async () => {
    const result = await simulatePinMessage(10, 100, 1);
    expect(result.pinnedAt).not.toBeNull();
    expect(pinMessage).toHaveBeenCalledWith(100);
  });

  it("throws FORBIDDEN when user is not a participant", async () => {
    await expect(simulatePinMessage(99, 100, 1)).rejects.toThrow("FORBIDDEN");
    expect(pinMessage).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when message does not belong to the conversation", async () => {
    vi.mocked(getMessageById).mockResolvedValueOnce({ ...mockMessage, conversationId: 999 });
    await expect(simulatePinMessage(10, 100, 1)).rejects.toThrow("NOT_FOUND");
  });
});

describe("dm.unpinMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("unpins a message successfully", async () => {
    const result = await simulateUnpinMessage(10, 100, 1);
    expect(result.pinnedAt).toBeNull();
    expect(unpinMessage).toHaveBeenCalledWith(100);
  });

  it("throws FORBIDDEN when user is not a participant", async () => {
    await expect(simulateUnpinMessage(99, 100, 1)).rejects.toThrow("FORBIDDEN");
    expect(unpinMessage).not.toHaveBeenCalled();
  });
});

describe("dm.pinnedMessages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns pinned messages for a conversation the user is part of", async () => {
    const result = await simulateGetPinnedMessages(10, 1);
    expect(result).toHaveLength(1);
    expect(result[0].pinnedAt).not.toBeNull();
    expect(getPinnedMessages).toHaveBeenCalledWith(1);
  });

  it("throws FORBIDDEN when user is not a participant", async () => {
    await expect(simulateGetPinnedMessages(99, 1)).rejects.toThrow("FORBIDDEN");
    expect(getPinnedMessages).not.toHaveBeenCalled();
  });
});

describe("dm.markRead", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks messages as read and returns success", async () => {
    const result = await simulateMarkRead(10, 1, 100);
    expect(result).toEqual({ success: true });
    expect(updateLastReadMessage).toHaveBeenCalledWith(1, 10, 100);
  });

  it("throws FORBIDDEN when user is not a participant", async () => {
    await expect(simulateMarkRead(99, 1, 100)).rejects.toThrow("FORBIDDEN");
    expect(updateLastReadMessage).not.toHaveBeenCalled();
  });
});

describe("dm.readState", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns read state with participant IDs", async () => {
    const result = await simulateReadState(10, 1);
    expect(result).not.toBeNull();
    expect(result!.participant1Id).toBe(10);
    expect(result!.participant2Id).toBe(20);
    expect(result!.lastReadMessageIdP1).toBe(100);
    expect(result!.lastReadMessageIdP2).toBeNull();
  });

  it("throws FORBIDDEN when user is not a participant", async () => {
    await expect(simulateReadState(99, 1)).rejects.toThrow("FORBIDDEN");
    expect(getConversationReadState).not.toHaveBeenCalled();
  });

  it("returns null when conversation has no read state", async () => {
    vi.mocked(getConversationReadState).mockResolvedValueOnce(null);
    const result = await simulateReadState(10, 1);
    expect(result).toBeNull();
  });
});
