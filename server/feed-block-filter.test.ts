import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const ALICE_ID = 1;
const BOB_ID = 2;    // blocked by Alice
const CAROL_ID = 3;  // not blocked

const makePost = (id: number, authorId: number) => ({
  id,
  authorId,
  text: `Post ${id}`,
  mediaUrl: null,
  mediaType: null,
  photo2Url: null,
  photo3Url: null,
  photo1Caption: null,
  photo2Caption: null,
  photo3Caption: null,
  docUrl: null,
  docName: null,
  docSize: null,
  docType: null,
  audioUrl: null,
  audioName: null,
  audioDuration: null,
  bgColor: null,
  linkUrl: null,
  linkTitle: null,
  linkDescription: null,
  linkImage: null,
  linkSiteName: null,
  isFlagged: false,
  isPinned: false,
  isScheduled: false,
  scheduledAt: null,
  deletedAt: null,
  resharedFromId: null,
  shareCount: 0,
  videoViews: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    // Block helpers — use literal 2 (BOB_ID) to avoid hoisting issues
    getBlockedUserIds: vi.fn().mockResolvedValue([2]),
    blockUser: vi.fn().mockResolvedValue(undefined),
    unblockUser: vi.fn().mockResolvedValue(undefined),
    getBlockedUsers: vi.fn().mockResolvedValue([]),
    isUserBlocked: vi.fn().mockResolvedValue(false),
    // Feed helpers — return posts from both Bob (2) and Carol (3)
    getFeedPosts: vi.fn().mockImplementation(async (_viewerId, _limit, _offset, excludeIds: number[] = []) => {
      const all = [
        { id: 10, authorId: 2, text: "Post 10", isFlagged: false, isPinned: false, isScheduled: false, createdAt: new Date("2026-09-04T09:00:00.000Z"), updatedAt: new Date("2026-09-04T09:00:00.000Z"), mediaUrl: null, mediaType: null, photo2Url: null, photo3Url: null, photo1Caption: null, photo2Caption: null, photo3Caption: null, docUrl: null, docName: null, docSize: null, docType: null, audioUrl: null, audioName: null, audioDuration: null, bgColor: null, linkUrl: null, linkTitle: null, linkDescription: null, linkImage: null, linkSiteName: null, scheduledAt: null, deletedAt: null, resharedFromId: null, shareCount: 0, videoViews: 0 },
        { id: 11, authorId: 3, text: "Post 11", isFlagged: false, isPinned: false, isScheduled: false, createdAt: new Date("2026-09-04T10:00:00.000Z"), updatedAt: new Date("2026-09-04T10:00:00.000Z"), mediaUrl: null, mediaType: null, photo2Url: null, photo3Url: null, photo1Caption: null, photo2Caption: null, photo3Caption: null, docUrl: null, docName: null, docSize: null, docType: null, audioUrl: null, audioName: null, audioDuration: null, bgColor: null, linkUrl: null, linkTitle: null, linkDescription: null, linkImage: null, linkSiteName: null, scheduledAt: null, deletedAt: null, resharedFromId: null, shareCount: 0, videoViews: 0 },
      ];
      return all.filter((p) => !excludeIds.includes(p.authorId));
    }),
    getPostsByUser: vi.fn().mockImplementation(async (authorId: number, _viewerId: number, _limit: number, _offset: number, excludeIds: number[] = []) => {
      if (excludeIds.includes(authorId)) return [];
      return [{ id: 10, authorId, text: "Post 10", isFlagged: false, isPinned: false, isScheduled: false, createdAt: new Date(), updatedAt: new Date(), mediaUrl: null, mediaType: null, photo2Url: null, photo3Url: null, photo1Caption: null, photo2Caption: null, photo3Caption: null, docUrl: null, docName: null, docSize: null, docType: null, audioUrl: null, audioName: null, audioDuration: null, bgColor: null, linkUrl: null, linkTitle: null, linkDescription: null, linkImage: null, linkSiteName: null, scheduledAt: null, deletedAt: null, resharedFromId: null, shareCount: 0, videoViews: 0 }];
    }),
    // Stubs for other procedures used by the router
    getFriends: vi.fn().mockResolvedValue([]),
    getFollowedPageIds: vi.fn().mockResolvedValue([]),
    getPageFeedPosts: vi.fn().mockResolvedValue([]),
    getUserById: vi.fn().mockResolvedValue({ id: 3, name: "Carol", avatar: null, isVerified: false }),
    getLikeCounts: vi.fn().mockResolvedValue({}),
    getOrgPageById: vi.fn().mockResolvedValue(null),
  };
});

const makeCtx = (userId: number): TrpcContext =>
  ({
    user: { id: userId, name: "Alice", email: "alice@test.com", role: "user" },
    req: {} as any,
    res: {} as any,
  } as TrpcContext);

// ─── posts.feed block filtering ───────────────────────────────────────────────
describe("posts.feed block filtering", () => {
  it("excludes posts from blocked users in the feed", async () => {
    const caller = appRouter.createCaller(makeCtx(ALICE_ID));
    const result = await caller.posts.feed({ limit: 20, offset: 0 });
    const authorIds = result.posts.map((p) => p.authorId);
    expect(authorIds).not.toContain(BOB_ID);
    expect(authorIds).toContain(CAROL_ID);
  });

  it("includes all posts when no one is blocked", async () => {
    const { getBlockedUserIds } = await import("./db");
    vi.mocked(getBlockedUserIds).mockResolvedValueOnce([]);
    const caller = appRouter.createCaller(makeCtx(ALICE_ID));
    const result = await caller.posts.feed({ limit: 20, offset: 0 });
    const authorIds = result.posts.map((p) => p.authorId);
    expect(authorIds).toContain(BOB_ID);
    expect(authorIds).toContain(CAROL_ID);
  });

  it("shows the newest normal post first in the Home Feed", async () => {
    const { getBlockedUserIds } = await import("./db");
    vi.mocked(getBlockedUserIds).mockResolvedValueOnce([]);
    const caller = appRouter.createCaller(makeCtx(ALICE_ID));
    const result = await caller.posts.feed({ limit: 20, offset: 0 });
    expect(result.posts.map((post) => post.id)).toEqual([11, 10]);
  });
});

// ─── posts.getByUser block filtering ──────────────────────────────────────────
describe("posts.getByUser block filtering", () => {
  it("returns empty array when viewing a blocked user's profile", async () => {
    const caller = appRouter.createCaller(makeCtx(ALICE_ID));
    const result = await caller.posts.getByUser({ userId: BOB_ID });
    expect(result).toEqual([]);
  });

  it("returns posts when viewing a non-blocked user's profile", async () => {
    const caller = appRouter.createCaller(makeCtx(ALICE_ID));
    const result = await caller.posts.getByUser({ userId: CAROL_ID });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].authorId).toBe(CAROL_ID);
  });
});
