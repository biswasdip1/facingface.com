import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock all db helpers used by polls router
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createPost: vi.fn().mockResolvedValue(42),
    createPoll: vi.fn().mockResolvedValue(10),
    createPollOptions: vi.fn().mockResolvedValue(undefined),
    getPollByPostId: vi.fn().mockResolvedValue({
      id: 10,
      postId: 42,
      question: "What is your favourite framework?",
      expiresAt: null,
      createdAt: new Date(),
    }),
    getPollOptions: vi.fn().mockResolvedValue([
      { id: 1, pollId: 10, text: "React", displayOrder: 0 },
      { id: 2, pollId: 10, text: "Vue", displayOrder: 1 },
      { id: 3, pollId: 10, text: "Svelte", displayOrder: 2 },
    ]),
    getPollVoteCounts: vi.fn().mockResolvedValue({ 1: 5, 2: 3, 3: 2 }),
    getUserPollVote: vi.fn().mockResolvedValue(undefined),
    upsertPollVote: vi.fn().mockResolvedValue(undefined),
    getPollById: vi.fn().mockResolvedValue({
      id: 10,
      postId: 42,
      question: "What is your favourite framework?",
      expiresAt: null,
      createdAt: new Date(),
    }),
    // Stubs for other procedures called during post creation
    moderateContent: vi.fn().mockResolvedValue({ flagged: false }),
    getFeedPosts: vi.fn().mockResolvedValue([]),
    getUserById: vi.fn().mockResolvedValue(null),
    getLikeCounts: vi.fn().mockResolvedValue({}),
    getUserLikedIds: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("./moderation", () => ({
  moderateContent: vi.fn().mockResolvedValue({ flagged: false }),
}));

vi.mock("./linkPreview", () => ({
  extractFirstUrl: vi.fn().mockReturnValue(null),
  fetchLinkPreview: vi.fn().mockResolvedValue(null),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test-key", url: "/manus-storage/test.jpg" }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function makeCtx(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("polls.getForPost", () => {
  it("returns poll with options, vote counts, and percentages", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.polls.getForPost({ postId: 42 });

    expect(result.poll).not.toBeNull();
    expect(result.poll!.question).toBe("What is your favourite framework?");
    expect(result.poll!.options).toHaveLength(3);
    expect(result.poll!.totalVotes).toBe(10);

    const reactOption = result.poll!.options.find((o) => o.text === "React");
    expect(reactOption!.voteCount).toBe(5);
    expect(reactOption!.percentage).toBe(50);
  });

  it("returns null poll when no poll exists for the post", async () => {
    const { getPollByPostId } = await import("./db");
    vi.mocked(getPollByPostId).mockResolvedValueOnce(undefined);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.polls.getForPost({ postId: 999 });
    expect(result.poll).toBeNull();
  });

  it("marks poll as expired when expiresAt is in the past", async () => {
    const { getPollByPostId } = await import("./db");
    vi.mocked(getPollByPostId).mockResolvedValueOnce({
      id: 10,
      postId: 42,
      question: "Expired poll?",
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.polls.getForPost({ postId: 42 });
    expect(result.poll!.isExpired).toBe(true);
  });

  it("shows userVotedOptionId when user has voted", async () => {
    const { getUserPollVote } = await import("./db");
    vi.mocked(getUserPollVote).mockResolvedValueOnce({
      id: 99,
      pollId: 10,
      optionId: 2,
      userId: 1,
      createdAt: new Date(),
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.polls.getForPost({ postId: 42 });
    expect(result.poll!.userVotedOptionId).toBe(2);
  });
});

describe("polls.vote", () => {
  it("casts a vote on a valid option", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.polls.vote({ pollId: 10, optionId: 1 });

    expect(result.success).toBe(true);
    expect(result.userVotedOptionId).toBe(1);
    expect(result.totalVotes).toBe(10);
  });

  it("throws NOT_FOUND when poll does not exist", async () => {
    const { getPollById } = await import("./db");
    vi.mocked(getPollById).mockResolvedValueOnce(undefined);

    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.polls.vote({ pollId: 999, optionId: 1 })
    ).rejects.toThrow("Poll not found");
  });

  it("throws BAD_REQUEST for an invalid option id", async () => {
    // Poll exists but option 9999 is not in the options list
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.polls.vote({ pollId: 10, optionId: 9999 })
    ).rejects.toThrow("Invalid poll option");
  });

  it("throws BAD_REQUEST when voting on an expired poll", async () => {
    const { getPollById } = await import("./db");
    vi.mocked(getPollById).mockResolvedValueOnce({
      id: 10,
      postId: 42,
      question: "Expired?",
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
    });

    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.polls.vote({ pollId: 10, optionId: 1 })
    ).rejects.toThrow("expired");
  });
});
