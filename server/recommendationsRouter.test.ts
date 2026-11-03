import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Post } from "../drizzle/schema";
import {
  FEED_INTERESTS,
  RECOMMENDATION_REASONS,
  type RecommendationSettings,
} from "../shared/recommendations";
import type { TrpcContext } from "./_core/context";
import type { RankingContext } from "./recommendationPolicy";

const mocks = vi.hoisted(() => ({
  getViewableWallPostById: vi.fn(),
  getBlockedUserIds: vi.fn(),
  getUserById: vi.fn(),
  getLikeCounts: vi.fn(),
  getCommentCounts: vi.fn(),
  getRecommendationSettings: vi.fn(),
  saveRecommendationSettings: vi.fn(),
  resetRecommendationSettings: vi.fn(),
  getRecommendationContext: vi.fn(),
  hideRecommendation: vi.fn(),
  unhideRecommendation: vi.fn(),
}));

vi.mock("./db", () => ({
  getViewableWallPostById: mocks.getViewableWallPostById,
  getBlockedUserIds: mocks.getBlockedUserIds,
  getUserById: mocks.getUserById,
  getLikeCounts: mocks.getLikeCounts,
  getCommentCounts: mocks.getCommentCounts,
}));
vi.mock("./recommendationStore", () => ({
  getRecommendationSettings: mocks.getRecommendationSettings,
  saveRecommendationSettings: mocks.saveRecommendationSettings,
  resetRecommendationSettings: mocks.resetRecommendationSettings,
  getRecommendationContext: mocks.getRecommendationContext,
  hideRecommendation: mocks.hideRecommendation,
  unhideRecommendation: mocks.unhideRecommendation,
}));

// Deliberately do not mock recommendationPolicy: feed assertions exercise its
// actual hidden-post filtering, ranking, and public reason selection.
import { recommendationsRouter } from "./recommendationsRouter";

const now = new Date("2026-10-01T12:00:00.000Z");
const defaults: RecommendationSettings = { interests: [], learnFromActivity: false };
const owner = {
  id: 42,
  name: "Member Forty Two",
  avatar: "/media/member.jpg",
  isVerified: true,
  email: "secret-email@example.test",
  passwordHash: "secret-password-hash",
  phone: "secret-phone",
  openId: "secret-open-id",
  role: "admin",
  suspendedUntil: null,
};

function caller(id: number | null) {
  return recommendationsRouter.createCaller({
    user: id === null ? null : { ...owner, id },
    req: { ip: "recommendations-fixture", socket: { remoteAddress: "fixture" } },
    res: { setHeader: vi.fn() },
  } as unknown as TrpcContext);
}

function post(id: number, overrides: Partial<Post> = {}): Post {
  return {
    id,
    authorId: 100 + id,
    text: "An ordinary update",
    mediaUrl: null,
    mediaType: null,
    isFlagged: false,
    flagReason: null,
    linkUrl: null,
    linkTitle: null,
    linkDescription: null,
    linkImage: null,
    linkSiteName: null,
    pageId: null,
    audience: "public",
    taggedPeople: null,
    feeling: null,
    checkInLocation: null,
    docUrl: null,
    docName: null,
    docSize: null,
    docType: null,
    photo2Url: null,
    photo3Url: null,
    photo1Caption: null,
    photo2Caption: null,
    photo3Caption: null,
    photo1Alt: null,
    photo2Alt: null,
    photo3Alt: null,
    videoPosterUrl: null,
    bgColor: null,
    audioUrl: null,
    audioName: null,
    audioDuration: null,
    resharedFromId: null,
    reshareComment: null,
    deletionScheduledAt: null,
    deletionWarningSentAt: null,
    editedAt: null,
    isPinned: false,
    videoViews: 0,
    scheduledAt: null,
    hideEditHistory: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function context(
  overrides: Partial<RankingContext & { candidates: Post[] }> = {},
): RankingContext & { candidates: Post[] } {
  return {
    candidates: [],
    interests: [],
    followedAuthorIds: [],
    communityTexts: [],
    activityPosts: [],
    hiddenPostIds: [],
    now,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getRecommendationSettings.mockResolvedValue({ ...defaults, activitySince: now });
  mocks.saveRecommendationSettings.mockImplementation(async (_id, settings) => ({
    ...settings,
    userId: 42,
    activitySince: now,
  }));
  mocks.resetRecommendationSettings.mockResolvedValue({ ...defaults, interests: [] });
  mocks.getRecommendationContext.mockResolvedValue(context());
  mocks.getViewableWallPostById.mockResolvedValue(post(1));
  mocks.getBlockedUserIds.mockResolvedValue([]);
  mocks.getUserById.mockImplementation(async (id: number) => ({ ...owner, id }));
  mocks.getLikeCounts.mockResolvedValue({});
  mocks.getCommentCounts.mockResolvedValue({});
  mocks.hideRecommendation.mockResolvedValue(undefined);
  mocks.unhideRecommendation.mockResolvedValue(undefined);
});

describe("recommendations authentication and account scope", () => {
  const anonymousRequests = {
    settings: () => caller(null).settings({ viewerId: 42 }),
    feed: () => caller(null).feed({ viewerId: 42 }),
    save: () => caller(null).save(defaults),
    reset: () => caller(null).reset(),
    hide: () => caller(null).hide({ postId: 1 }),
    unhide: () => caller(null).unhide({ postId: 1 }),
  };

  it.each(Object.entries(anonymousRequests))(
    "requires login for %s before accessing any dependencies",
    async (_endpoint, request) => {
      await expect(request()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      for (const mock of Object.values(mocks)) expect(mock).not.toHaveBeenCalled();
    },
  );

  describe.each(["settings", "feed"] as const)("%s read scope", endpoint => {
    it("rejects another viewer's cache scope before accessing storage", async () => {
      await expect(caller(42)[endpoint]({ viewerId: 99 })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(mocks.getRecommendationSettings).not.toHaveBeenCalled();
      expect(mocks.getRecommendationContext).not.toHaveBeenCalled();
    });

    it.each([
      undefined,
      {},
      { viewerId: 0 },
      { viewerId: -1 },
      { viewerId: 1.5 },
      { viewerId: "42" },
      { viewerId: 42, userId: 99 },
    ])("rejects malformed or missing scope %j", async input => {
      await expect(caller(42)[endpoint](input as any)).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
      expect(mocks.getRecommendationSettings).not.toHaveBeenCalled();
      expect(mocks.getRecommendationContext).not.toHaveBeenCalled();
    });
  });

  it.each([42, 7])("reads only authenticated account %i settings and strips internal fields", async id => {
    mocks.getRecommendationSettings.mockResolvedValue({
      interests: ["music"],
      learnFromActivity: true,
      userId: id,
      activitySince: now,
      hiddenPostIds: [987654],
    });
    expect(await caller(id).settings({ viewerId: id })).toEqual({
      interests: ["music"],
      learnFromActivity: true,
    });
    expect(mocks.getRecommendationSettings.mock.calls).toEqual([[id]]);
  });

  it.each([42, 7])("reads only authenticated account %i feed context", async id => {
    await caller(id).feed({ viewerId: id });
    expect(mocks.getRecommendationContext.mock.calls).toEqual([[id]]);
  });
});

describe("recommendation settings mutations", () => {
  it.each([42, 7])("saves only authenticated owner %i without accepting an owner ID", async id => {
    const settings: RecommendationSettings = {
      interests: ["music", "technology"],
      learnFromActivity: true,
    };
    expect(await caller(id).save(settings)).toEqual(settings);
    expect(mocks.saveRecommendationSettings.mock.calls).toEqual([[id, settings]]);
  });

  it.each([42, 7])("resets only authenticated owner %i", async id => {
    expect(await caller(id).reset()).toEqual(defaults);
    expect(mocks.resetRecommendationSettings.mock.calls).toEqual([[id]]);
    expect(mocks.saveRecommendationSettings).not.toHaveBeenCalled();
  });

  it("cannot redirect a no-input reset with an injected owner ID", async () => {
    // Unlike the strict input schemas, reset has no input parser. tRPC ignores
    // a raw payload, but it must never use that payload as account authority.
    const resetWithRawInput = caller(42).reset as unknown as (
      input: { userId: number },
    ) => Promise<RecommendationSettings>;
    expect(await resetWithRawInput({ userId: 99 })).toEqual(defaults);
    expect(mocks.resetRecommendationSettings.mock.calls).toEqual([[42]]);
  });

  it.each(FEED_INTERESTS.map(interest => interest.id))(
    "accepts catalog interest %s",
    async interest => {
      const settings = { interests: [interest], learnFromActivity: false };
      await caller(42).save(settings);
      expect(mocks.saveRecommendationSettings.mock.calls).toEqual([[42, settings]]);
    },
  );

  it.each([0, 8])("accepts %i distinct catalog interests", async count => {
    const settings = {
      interests: FEED_INTERESTS.slice(0, count).map(interest => interest.id),
      learnFromActivity: false,
    };
    await caller(42).save(settings);
    expect(mocks.saveRecommendationSettings.mock.calls).toEqual([[42, settings]]);
  });

  it.each([
    { interests: FEED_INTERESTS.slice(0, 9).map(interest => interest.id), learnFromActivity: false },
    { interests: ["music", "music"], learnFromActivity: false },
    { interests: ["not-in-the-catalog"], learnFromActivity: false },
    { interests: ["Music"], learnFromActivity: false },
    { interests: "music", learnFromActivity: false },
    { interests: [], learnFromActivity: "true" },
    { interests: [] },
    { learnFromActivity: false },
  ])("rejects invalid settings without persisting them: %j", async input => {
    await expect(caller(42).save(input as any)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.saveRecommendationSettings).not.toHaveBeenCalled();
  });

  it.each(["save", "hide", "unhide"] as const)(
    "%s strictly rejects injected userId before any dependency call",
    async endpoint => {
      const api = caller(42);
      const request = endpoint === "save"
        ? api.save({ ...defaults, userId: 99 } as any)
        : api[endpoint]({ postId: 1, userId: 99 } as any);
      await expect(request).rejects.toMatchObject({ code: "BAD_REQUEST" });
      for (const mock of Object.values(mocks)) expect(mock).not.toHaveBeenCalled();
    },
  );
});

describe("hiding and unhiding recommendations", () => {
  it.each([42, 7])("hides a viewable post only for authenticated owner %i", async id => {
    expect(await caller(id).hide({ postId: 1 })).toEqual({ success: true });
    expect(mocks.getViewableWallPostById.mock.calls).toEqual([[1, id]]);
    expect(mocks.getBlockedUserIds.mock.calls).toEqual([[id]]);
    expect(mocks.hideRecommendation.mock.calls).toEqual([[id, 1]]);
  });

  it.each(["missing", "private", "flagged", "blocked"] as const)(
    "does not store a hidden record for a %s post",
    async unavailable => {
      // The viewer-aware database helper returns undefined for both nonexistent
      // posts and private posts this viewer is not authorized to see.
      mocks.getViewableWallPostById.mockResolvedValue(
        unavailable === "missing" || unavailable === "private"
          ? undefined
          : post(1, { authorId: 101, isFlagged: unavailable === "flagged" }),
      );
      mocks.getBlockedUserIds.mockResolvedValue(unavailable === "blocked" ? [101] : []);
      await expect(caller(42).hide({ postId: 1 })).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "This post is no longer available.",
      });
      expect(mocks.getViewableWallPostById.mock.calls).toEqual([[1, 42]]);
      expect(mocks.getBlockedUserIds.mock.calls).toEqual([[42]]);
      expect(mocks.hideRecommendation).not.toHaveBeenCalled();
      expect(mocks.unhideRecommendation).not.toHaveBeenCalled();
      expect(mocks.saveRecommendationSettings).not.toHaveBeenCalled();
      expect(mocks.resetRecommendationSettings).not.toHaveBeenCalled();
    },
  );

  it.each([42, 7])("unhides only authenticated owner %i's record", async id => {
    expect(await caller(id).unhide({ postId: 987654 })).toEqual({ success: true });
    expect(mocks.unhideRecommendation.mock.calls).toEqual([[id, 987654]]);
    expect(mocks.hideRecommendation).not.toHaveBeenCalled();
    expect(mocks.getViewableWallPostById).not.toHaveBeenCalled();
  });

  describe.each(["hide", "unhide"] as const)("%s input", endpoint => {
    it.each([0, -1, 1.5, "1", null])("rejects invalid post ID %j", async postId => {
      await expect(caller(42)[endpoint]({ postId } as any)).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
      for (const mock of Object.values(mocks)) expect(mock).not.toHaveBeenCalled();
    });
  });
});

describe("recommendation feed privacy and real ranking", () => {
  it("returns only public author fields, not raw account records", async () => {
    const candidates = [post(1, { authorId: 11 }), post(2, { authorId: 11 })];
    mocks.getRecommendationContext.mockResolvedValue(context({ candidates }));
    const result = await caller(42).feed({ viewerId: 42 });
    expect(result.authors).toEqual({
      11: {
        id: 11,
        name: owner.name,
        avatar: owner.avatar,
        isVerified: true,
      },
    });
    expect(mocks.getUserById.mock.calls).toEqual([[11]]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("secret-");
    for (const field of ["email", "passwordHash", "phone", "openId", "role", "suspendedUntil"]) {
      expect(result.authors[11]).not.toHaveProperty(field);
    }
  });

  it("omits missing authors and supplies safe defaults for optional public fields", async () => {
    mocks.getRecommendationContext.mockResolvedValue(context({
      candidates: [post(1, { authorId: 11 }), post(2, { authorId: 12 })],
    }));
    mocks.getUserById.mockImplementation(async (id: number) => id === 11
      ? { ...owner, id, name: null, avatar: undefined, isVerified: undefined }
      : undefined);
    const result = await caller(42).feed({ viewerId: 42 });
    expect(result.authors).toEqual({
      11: { id: 11, name: null, avatar: null, isVerified: false },
    });
  });

  it("excludes hidden posts and never returns hidden IDs or private context signals", async () => {
    const visible = post(1, { authorId: 11 });
    mocks.getRecommendationContext.mockResolvedValue(context({
      candidates: [visible, post(987654, { authorId: 987655, text: "hidden-secret-body" })],
      hiddenPostIds: [987654, 987656],
      followedAuthorIds: [987655],
      communityTexts: ["private-context-community"],
      activityPosts: [post(987657, { text: "private-context-activity" })],
    }));
    const result = await caller(42).feed({ viewerId: 42 });
    expect(result.posts).toEqual([visible]);
    expect(result.reasons).toEqual({ 1: "recent" });
    expect(Object.keys(result).sort()).toEqual([
      "authors", "commentCounts", "likeCounts", "poolSize", "posts", "reasons",
    ]);
    expect(mocks.getUserById.mock.calls).toEqual([[11]]);
    expect(mocks.getLikeCounts.mock.calls).toEqual([[[1], "post"]]);
    expect(mocks.getCommentCounts.mock.calls).toEqual([[[1]]]);
    const serialized = JSON.stringify(result);
    for (const secret of ["987654", "987655", "987656", "987657", "hidden-secret", "private-context"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("returns an empty feed without requiring authors or leaking context", async () => {
    expect(await caller(42).feed({ viewerId: 42 })).toEqual({
      posts: [],
      authors: {},
      likeCounts: {},
      commentCounts: {},
      reasons: {},
      poolSize: 0,
    });
    expect(mocks.getUserById).not.toHaveBeenCalled();
    expect(mocks.getLikeCounts.mock.calls).toEqual([[[], "post"]]);
    expect(mocks.getCommentCounts.mock.calls).toEqual([[[]]]);
  });

  it("returns an empty result when every candidate is hidden", async () => {
    mocks.getRecommendationContext.mockResolvedValue(context({
      candidates: [post(987654)],
      hiddenPostIds: [987654],
    }));
    const result = await caller(42).feed({ viewerId: 42 });
    expect(result).toEqual({
      posts: [], authors: {}, likeCounts: {}, commentCounts: {}, reasons: {}, poolSize: 1,
    });
    expect(mocks.getUserById).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("987654");
  });

  it("ranks explicit interests above following and following above an unaffiliated recent post", async () => {
    const recent = post(30, { authorId: 30 });
    const followed = post(20, { authorId: 20 });
    const explicit = post(10, { authorId: 10, text: "Music and dance at the concert" });
    mocks.getRecommendationContext.mockResolvedValue(context({
      candidates: [recent, followed, explicit],
      interests: ["music"],
      followedAuthorIds: [20],
    }));
    const result = await caller(42).feed({ viewerId: 42 });
    expect(result.posts).toEqual([explicit, followed, recent]);
    expect(result.reasons).toEqual({ 10: "interest", 20: "following", 30: "recent" });
  });

  it("returns only public reason codes rather than scores or matching signal details", async () => {
    mocks.getRecommendationContext.mockResolvedValue(context({
      candidates: [
        post(1, { text: "Music concert" }),
        post(2, { authorId: 22 }),
        post(3, { text: "Garden wildlife" }),
        post(4, { text: "Software coding" }),
        post(5),
      ],
      interests: ["music"],
      followedAuthorIds: [22],
      communityTexts: ["private-community-name nature"],
      activityPosts: [post(987654, { text: "private-activity-text software" })],
    }));
    const result = await caller(42).feed({ viewerId: 42 });
    expect(result.reasons).toEqual({
      1: "interest", 2: "following", 3: "community", 4: "activity", 5: "recent",
    });
    for (const reason of Object.values(result.reasons)) {
      expect(Object.keys(RECOMMENDATION_REASONS)).toContain(reason);
      expect(typeof reason).toBe("string");
    }
    const serialized = JSON.stringify(result);
    for (const field of ["score", "communityTexts", "activityPosts", "followedAuthorIds", "hiddenPostIds"]) {
      expect(result).not.toHaveProperty(field);
    }
    expect(serialized).not.toContain("private-community-name");
    expect(serialized).not.toContain("private-activity-text");
    expect(serialized).not.toContain("987654");
  });

  it("preserves post fields and existing reaction/like and comment counts after ranking", async () => {
    const first = post(1, { text: "Photo update", mediaUrl: "/media/photo.jpg", mediaType: "image", videoViews: 9 });
    const second = post(2, { text: "Music concert", linkTitle: "A song" });
    const likeCounts = { 1: 17, 2: 3 };
    const commentCounts = { 1: 5, 2: 11 };
    mocks.getRecommendationContext.mockResolvedValue(context({
      candidates: [first, second], interests: ["music"],
    }));
    mocks.getLikeCounts.mockResolvedValue(likeCounts);
    mocks.getCommentCounts.mockResolvedValue(commentCounts);
    const result = await caller(42).feed({ viewerId: 42 });
    expect(result.posts).toEqual([second, first]);
    expect(result.likeCounts).toEqual(likeCounts);
    expect(result.commentCounts).toEqual(commentCounts);
    expect(mocks.getLikeCounts.mock.calls).toEqual([[[2, 1], "post"]]);
    expect(mocks.getCommentCounts.mock.calls).toEqual([[[2, 1]]]);
  });

  it("bounds the ranked snapshot to 120 posts and fetches counts only for returned posts", async () => {
    mocks.getRecommendationContext.mockResolvedValue(context({
      candidates: Array.from({ length: 125 }, (_, index) => post(index + 1)),
    }));
    const result = await caller(42).feed({ viewerId: 42 });
    const expectedIds = Array.from({ length: 120 }, (_, index) => 125 - index);
    expect(result.posts.map(item => item.id)).toEqual(expectedIds);
    expect(result.poolSize).toBe(125);
    expect(Object.keys(result.reasons)).toHaveLength(120);
    expect(mocks.getLikeCounts.mock.calls).toEqual([[expectedIds, "post"]]);
    expect(mocks.getCommentCounts.mock.calls).toEqual([[expectedIds]]);
  });
});
