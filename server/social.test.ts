import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB and moderation ───────────────────────────────────────────────────

vi.mock("./db", () => ({
  getReshareCountsBatch: vi.fn().mockResolvedValue({}),
  countUserPostsByTypeInWindow: vi.fn().mockResolvedValue(0),
  countUserLiveStreamsInWindow: vi.fn().mockResolvedValue(0),
  getUserDailyQuota: vi.fn().mockResolvedValue({ video: 2, photo: 3, audio: 12, doc: 2, poll: 2, live: 3 }),
  DAILY_LIMITS: { video: 2, photo: 3, audio: 12, doc: 2, poll: 2, live: 3 },
  isUserSuspended: vi.fn().mockResolvedValue({ suspended: false }),
  incrementUserViolation: vi.fn().mockResolvedValue(1),
  suspendUser: vi.fn().mockResolvedValue(undefined),
  flagPost: vi.fn().mockResolvedValue(undefined),
  getMediaPostsDueForWarning: vi.fn().mockResolvedValue([]),
  schedulePostDeletion: vi.fn().mockResolvedValue(undefined),
  getPostsDueForDeletion: vi.fn().mockResolvedValue([]),
  adminDeletePost: vi.fn().mockResolvedValue(undefined),
  getEmojiReaction: vi.fn().mockResolvedValue(undefined),
  addEmojiReaction: vi.fn().mockResolvedValue(undefined),
  removeEmojiReaction: vi.fn().mockResolvedValue(undefined),
  getEmojiReactionCounts: vi.fn().mockResolvedValue({}),
  getUserEmojiReactions: vi.fn().mockResolvedValue([]),
  getEmojiReactionCountsBatch: vi.fn().mockResolvedValue({}),
  getUserEmojiReactionsBatch: vi.fn().mockResolvedValue({}),
  recordShare: vi.fn().mockResolvedValue(undefined),
  getShareCounts: vi.fn().mockResolvedValue({}),
  ...({} as Record<string, unknown>),
  // original mocks below:
  getFeedPosts: vi.fn().mockResolvedValue([]),
  getPostsByUser: vi.fn().mockResolvedValue([]),
  getFriends: vi.fn().mockResolvedValue([]),
  getUserById: vi.fn().mockResolvedValue({ id: 1, name: "Alice", avatar: null }),
  getLikeCounts: vi.fn().mockResolvedValue({}),
  getUserLikedIds: vi.fn().mockResolvedValue([]),
  createPost: vi.fn().mockResolvedValue(42),
  deletePost: vi.fn().mockResolvedValue(undefined),
  getPostById: vi.fn().mockResolvedValue({ id: 1, authorId: 2, text: "Hello", postId: 1, audience: "public" }),
  getPostForViewer: vi.fn().mockResolvedValue({ id: 1, authorId: 2, text: "Hello", postId: 1, audience: "public" }),
  getCommentsByPost: vi.fn().mockResolvedValue([]),
  createComment: vi.fn().mockResolvedValue(10),
  deleteComment: vi.fn().mockResolvedValue(undefined),
  getCommentById: vi.fn().mockResolvedValue({ id: 10, authorId: 2, postId: 1, text: "Nice" }),
  getLike: vi.fn().mockResolvedValue(undefined),
  addLike: vi.fn().mockResolvedValue(undefined),
  removeLike: vi.fn().mockResolvedValue(undefined),
  getLikeCount: vi.fn().mockResolvedValue(0),
  getFollow: vi.fn().mockResolvedValue(undefined),
  addFollow: vi.fn().mockResolvedValue(undefined),
  removeFollow: vi.fn().mockResolvedValue(undefined),
  getFollowerCount: vi.fn().mockResolvedValue(5),
  getFollowingCount: vi.fn().mockResolvedValue(3),
  getFollowers: vi.fn().mockResolvedValue([]),
  getFollowing: vi.fn().mockResolvedValue([]),
  getNotifications: vi.fn().mockResolvedValue([]),
  getUnreadNotificationCount: vi.fn().mockResolvedValue(0),
  markNotificationsRead: vi.fn().mockResolvedValue(undefined),
  createNotification: vi.fn().mockResolvedValue(undefined),
  getPostCount: vi.fn().mockResolvedValue(7),
  updateUserProfile: vi.fn().mockResolvedValue(undefined),
  searchUsers: vi.fn().mockResolvedValue([]),
  searchPosts: vi.fn().mockResolvedValue([]),
  extractHashtags: vi.fn().mockReturnValue([]),
  saveHashtags: vi.fn().mockResolvedValue(undefined),
  editPost: vi.fn().mockResolvedValue(undefined),
  getPostsByHashtag: vi.fn().mockResolvedValue([]),
  getFollowedPageIds: vi.fn().mockResolvedValue([]),
  getPageFeedPosts: vi.fn().mockResolvedValue([]),
  getBlockedUserIds: vi.fn().mockResolvedValue([]),
  getMediaLimits: vi.fn().mockResolvedValue({ photo_max_mb: 10, video_max_mb: 10, video_max_seconds: 120, audio_max_mb: 5, audio_max_seconds: 360, doc_max_mb: 5 }),
}));

vi.mock("./imageUtils", () => ({
  compressImage: vi.fn().mockResolvedValue({ buffer: Buffer.alloc(100), mimeType: "image/webp" }),
}));

vi.mock("./moderation", () => ({
  moderateContent: vi.fn().mockResolvedValue({ flagged: false }),
  moderateImageBuffer: vi.fn().mockResolvedValue({ flagged: false }),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "/manus-storage/test.jpg", key: "test.jpg" }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCtx(userId = 1, role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role,
      bio: null,
      avatar: null,
      coverPhoto: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Posts ────────────────────────────────────────────────────────────────────

describe("posts.feed", () => {
  it("returns empty feed when no posts", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.posts.feed({ limit: 20, offset: 0 });
    expect(result.posts).toEqual([]);
  });
});

describe("posts.create", () => {
  it("creates a post with text", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.posts.create({ text: "Hello world!" });
    expect(result.postId).toBe(42);
  });

  it("rejects a post with no text and no media", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.posts.create({})).rejects.toThrow("Post must have text, media, a poll, or a document");
  });

  it("blocks flagged content", async () => {
    const { moderateContent } = await import("./moderation");
    vi.mocked(moderateContent).mockResolvedValueOnce({ flagged: true, reason: "Hate speech" });

    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.posts.create({ text: "offensive content" })).rejects.toThrow("flagged");
  });

  it("passes photo captions to createPost", async () => {
    const { createPost } = await import("./db");
    vi.mocked(createPost).mockResolvedValueOnce(99);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.posts.create({
      mediaUrl: "https://example.com/photo1.jpg",
      mediaType: "image",
      photo2Url: "https://example.com/photo2.jpg",
      photo3Url: "https://example.com/photo3.jpg",
      photo1Caption: "Sunset view",
      photo2Caption: "Mountain trail",
      photo3Caption: "Lake reflection",
    });
    expect(result.postId).toBe(99);
    expect(vi.mocked(createPost)).toHaveBeenCalledWith(
      expect.objectContaining({
        photo1Caption: "Sunset view",
        photo2Caption: "Mountain trail",
        photo3Caption: "Lake reflection",
      })
    );
  });
});

describe("posts.delete", () => {
  it("deletes a post owned by the user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.posts.delete({ postId: 1 });
    expect(result.success).toBe(true);
  });
});

// ─── Comments ─────────────────────────────────────────────────────────────────

describe("comments.list", () => {
  it("returns empty list when no comments", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.comments.list({ postId: 1 });
    expect(result.comments).toEqual([]);
  });
});

describe("comments.create", () => {
  it("creates a comment", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.comments.create({ postId: 1, text: "Great post!" });
    expect(result.commentId).toBe(10);
  });

  it("blocks flagged comment", async () => {
    const { moderateContent } = await import("./moderation");
    vi.mocked(moderateContent).mockResolvedValueOnce({ flagged: true, reason: "Spam" });

    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.comments.create({ postId: 1, text: "buy now!!!" })).rejects.toThrow("flagged");
  });

  it("rejects empty comment", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.comments.create({ postId: 1, text: "" })).rejects.toThrow();
  });
});

// ─── Likes ────────────────────────────────────────────────────────────────────

describe("likes.toggle", () => {
  it("likes a post when not already liked", async () => {
    const { getLike } = await import("./db");
    vi.mocked(getLike).mockResolvedValueOnce(undefined);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.likes.toggle({ targetId: 1, targetType: "post" });
    expect(result.liked).toBe(true);
  });

  it("unlikes a post when already liked", async () => {
    const { getLike } = await import("./db");
    vi.mocked(getLike).mockResolvedValueOnce({
      id: 1, userId: 1, targetId: 1, targetType: "post", createdAt: new Date()
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.likes.toggle({ targetId: 1, targetType: "post" });
    expect(result.liked).toBe(false);
  });
});

// ─── Follows ──────────────────────────────────────────────────────────────────

describe("follows.toggle", () => {
  it("follows a user when not already following", async () => {
    const { getFollow } = await import("./db");
    vi.mocked(getFollow).mockResolvedValueOnce(undefined);

    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.follows.toggle({ targetUserId: 2 });
    expect(result.following).toBe(true);
  });

  it("unfollows a user when already following", async () => {
    const { getFollow } = await import("./db");
    vi.mocked(getFollow).mockResolvedValueOnce({
      id: 1, followerId: 1, followingId: 2, createdAt: new Date()
    });

    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.follows.toggle({ targetUserId: 2 });
    expect(result.following).toBe(false);
  });

  it("prevents self-follow", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(caller.follows.toggle({ targetUserId: 1 })).rejects.toThrow("cannot follow yourself");
  });
});

describe("follows.status", () => {
  it("returns not following by default", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.follows.status({ targetUserId: 2 });
    expect(result.following).toBe(false);
  });
});

// ─── Notifications ────────────────────────────────────────────────────────────

describe("notifications.list", () => {
  it("returns empty notifications", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.notifications.list();
    expect(result.notifications).toEqual([]);
  });
});

describe("notifications.unreadCount", () => {
  it("returns zero unread count", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.notifications.unreadCount();
    expect(result.count).toBe(0);
  });
});

describe("notifications.markRead", () => {
  it("marks notifications as read", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.notifications.markRead();
    expect(result.success).toBe(true);
  });
});

// ─── Users ────────────────────────────────────────────────────────────────────

describe("users.getProfile", () => {
  it("returns user profile with stats", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.users.getProfile({ userId: 1 });
    expect(result.user).toBeDefined();
    expect(result.followerCount).toBe(5);
    expect(result.followingCount).toBe(3);
    expect(result.postCount).toBe(7);
  });
});

describe("users.updateProfile", () => {
  it("updates user profile", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.users.updateProfile({ name: "New Name", bio: "My bio" });
    expect(result.success).toBe(true);
  });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});

// ─── Document Upload ──────────────────────────────────────────────────────────

describe("media.uploadDoc", () => {
  it("accepts a valid PDF document", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const fakeBase64 = Buffer.from("fake pdf content").toString("base64");
    const result = await caller.media.uploadDoc({
      filename: "tax-return.pdf",
      contentType: "application/pdf",
      base64: fakeBase64,
    });
    expect(result.filename).toBe("tax-return.pdf");
    expect(result.url).toBeDefined();
  });

  it("rejects an invalid document type", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const fakeBase64 = Buffer.from("fake exe content").toString("base64");
    await expect(
      caller.media.uploadDoc({
        filename: "malware.exe",
        contentType: "application/x-msdownload",
        base64: fakeBase64,
      })
    ).rejects.toThrow("Unsupported document type");
  });

  it("rejects a document exceeding 20 MB", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const oversizedBuffer = Buffer.alloc(21 * 1024 * 1024, "x");
    const oversizedBase64 = oversizedBuffer.toString("base64");
    await expect(
      caller.media.uploadDoc({
        filename: "huge.pdf",
        contentType: "application/pdf",
        base64: oversizedBase64,
      })
    ).rejects.toThrow("Document too large");
  });
});

describe("posts.create with document", () => {
  it("creates a post with a document attachment", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.posts.create({
      text: "Here is my tax document",
      docUrl: "/manus-storage/docs/1/tax.pdf",
      docName: "tax.pdf",
      docSize: 102400,
      docType: "application/pdf",
    });
    expect(result.postId).toBe(42);
  });

  it("creates a post with only a document (no text)", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.posts.create({
      docUrl: "/manus-storage/docs/1/report.xlsx",
      docName: "report.xlsx",
      docSize: 51200,
      docType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    expect(result.postId).toBe(42);
  });
});

// ─── Media Limits Tests ───────────────────────────────────────────────────────

function createAuthContext() {
  return makeCtx(1);
}

describe("media.upload — photo limits", () => {
  it("rejects a photo over 10 MB", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const bigBase64 = Buffer.alloc(11 * 1024 * 1024).toString("base64");
    await expect(
      caller.media.upload({
        filename: "big.jpg",
        contentType: "image/jpeg",
        base64: bigBase64,
        mediaType: "image",
      })
    ).rejects.toThrow("10 MB");
  });

  it("accepts a photo within 10 MB", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const smallBase64 = Buffer.alloc(100).toString("base64");
    const result = await caller.media.upload({
      filename: "ok.jpg",
      contentType: "image/jpeg",
      base64: smallBase64,
      mediaType: "image",
    });
    expect(result.url).toBeTruthy();
  });
});

describe("media.upload — video limits", () => {
  it("rejects a video over 10 MB", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const bigBase64 = Buffer.alloc(11 * 1024 * 1024).toString("base64");
    await expect(
      caller.media.upload({
        filename: "big.mp4",
        contentType: "video/mp4",
        base64: bigBase64,
        mediaType: "video",
      })
    ).rejects.toThrow("10 MB");
  });

  it("rejects a video longer than 2 minutes", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const smallBase64 = Buffer.alloc(100).toString("base64");
    await expect(
      caller.media.upload({
        filename: "long.mp4",
        contentType: "video/mp4",
        base64: smallBase64,
        mediaType: "video",
        duration: 150, // 2.5 minutes — over limit
      })
    ).rejects.toThrow("2 minutes");
  });

  it("accepts a video within limits (90s, small size)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const smallBase64 = Buffer.alloc(100).toString("base64");
    const result = await caller.media.upload({
      filename: "ok.mp4",
      contentType: "video/mp4",
      base64: smallBase64,
      mediaType: "video",
      duration: 90,
    });
    expect(result.url).toBeTruthy();
  });
});

describe("media.uploadAudio — audio limits", () => {
  it("rejects audio over 5 MB", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const bigBase64 = Buffer.alloc(6 * 1024 * 1024).toString("base64");
    await expect(
      caller.media.uploadAudio({
        filename: "big.mp3",
        contentType: "audio/mpeg",
        base64: bigBase64,
      })
    ).rejects.toThrow("5 MB");
  });

  it("rejects audio longer than 6 minutes", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const smallBase64 = Buffer.alloc(100).toString("base64");
    await expect(
      caller.media.uploadAudio({
        filename: "long.mp3",
        contentType: "audio/mpeg",
        base64: smallBase64,
        duration: 400, // 6.67 minutes — over limit
      })
    ).rejects.toThrow("6 minutes");
  });

  it("accepts audio within limits (5 min, small size)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const smallBase64 = Buffer.alloc(100).toString("base64");
    const result = await caller.media.uploadAudio({
      filename: "ok.mp3",
      contentType: "audio/mpeg",
      base64: smallBase64,
      duration: 300,
    });
    expect(result.url).toBeTruthy();
  });
});

// ─── Reactions ───────────────────────────────────────────────────────────────

describe("reactions.toggle", () => {
  it("adds a reaction when not already reacted", async () => {
    const { getEmojiReaction } = await import("./db");
    vi.mocked(getEmojiReaction).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.reactions.toggle({ targetId: 1, targetType: "post", emoji: "❤️" });
    expect(result.reacted).toBe(true);
  });

  it("removes a reaction when already reacted", async () => {
    const { getEmojiReaction } = await import("./db");
    vi.mocked(getEmojiReaction).mockResolvedValueOnce({
      id: 1, userId: 1, targetId: 1, targetType: "post", emoji: "❤️", createdAt: new Date(),
    });
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.reactions.toggle({ targetId: 1, targetType: "post", emoji: "❤️" });
    expect(result.reacted).toBe(false);
  });
});

describe("reactions.getCounts", () => {
  it("returns empty counts and no user reactions by default", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.reactions.getCounts({ targetId: 1, targetType: "post" });
    expect(result.counts).toEqual({});
    expect(result.myReactions).toEqual([]);
  });
});

// ─── Shares ───────────────────────────────────────────────────────────────────

describe("shares.record", () => {
  it("records a share and returns success", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.shares.record({ postId: 1 });
    expect(result.success).toBe(true);
  });
});

describe("shares.getCounts", () => {
  it("returns empty share counts by default", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.shares.getCounts({ postIds: [1, 2] });
    expect(result).toEqual({});
  });
});

// ─── Reshare ─────────────────────────────────────────────────────────────────

describe("posts.reshare", () => {
  it("reshares an existing post", async () => {
    const { createPost, getPostForViewer } = await import("./db");
    vi.mocked(getPostForViewer).mockResolvedValueOnce({
      id: 1, authorId: 2, text: "Original post", resharedFromId: null,
      mediaUrl: null, mediaType: null, photo2Url: null, photo3Url: null,
      photo1Caption: null, photo2Caption: null, photo3Caption: null,
      linkUrl: null, linkTitle: null, linkDescription: null, linkImage: null, linkSiteName: null,
      docUrl: null, docName: null, docSize: null, docType: null,
      bgColor: null, audioUrl: null, audioName: null, audioDuration: null,
      reshareComment: null, isFlagged: false, pollId: null, audience: "public",
      createdAt: new Date(), updatedAt: new Date(),
    });
    vi.mocked(createPost).mockResolvedValueOnce(55);
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.posts.reshare({ originalPostId: 1, comment: "Great post!" });
    expect(result.postId).toBe(55);
    expect(vi.mocked(createPost)).toHaveBeenCalledWith(
      expect.objectContaining({ resharedFromId: 1, authorId: 1 })
    );
  });

  it("throws NOT_FOUND when original post does not exist", async () => {
    const { getPostForViewer } = await import("./db");
    vi.mocked(getPostForViewer).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(caller.posts.reshare({ originalPostId: 999 })).rejects.toThrow("not found");
  });

  it("uses root post id when resharing a reshare", async () => {
    const { createPost, getPostForViewer } = await import("./db");
    // Simulate resharing a post that is itself a reshare (resharedFromId = 5)
    vi.mocked(getPostForViewer).mockResolvedValueOnce({
      id: 10, authorId: 2, text: "Reshared post", resharedFromId: 5,
      mediaUrl: null, mediaType: null, photo2Url: null, photo3Url: null,
      photo1Caption: null, photo2Caption: null, photo3Caption: null,
      linkUrl: null, linkTitle: null, linkDescription: null, linkImage: null, linkSiteName: null,
      docUrl: null, docName: null, docSize: null, docType: null,
      bgColor: null, audioUrl: null, audioName: null, audioDuration: null,
      reshareComment: null, isFlagged: false, pollId: null, audience: "public",
      createdAt: new Date(), updatedAt: new Date(),
    }).mockResolvedValueOnce({
      id: 5, authorId: 2, text: "Root post", resharedFromId: null, audience: "public",
      mediaUrl: null, mediaType: null, linkSiteName: null,
    } as any);
    vi.mocked(createPost).mockResolvedValueOnce(60);
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.posts.reshare({ originalPostId: 10 });
    expect(result.postId).toBe(60);
    // Should point to root (5), not the intermediate reshare (10)
    expect(vi.mocked(createPost)).toHaveBeenCalledWith(
      expect.objectContaining({ resharedFromId: 5 })
    );
  });
});

// ─── Comment replies ──────────────────────────────────────────────────────────

describe("comments.create with parentId", () => {
  it("creates a reply to a comment", async () => {
    const { createComment } = await import("./db");
    vi.mocked(createComment).mockResolvedValueOnce(20);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.comments.create({ postId: 1, text: "Great reply!", parentId: 10 });
    expect(result.commentId).toBe(20);
    expect(vi.mocked(createComment)).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: 10 })
    );
  });
});

describe("media.uploadDoc — document limits", () => {
  it("rejects a document over 5 MB", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const bigBase64 = Buffer.alloc(6 * 1024 * 1024).toString("base64");
    await expect(
      caller.media.uploadDoc({
        filename: "big.pdf",
        contentType: "application/pdf",
        base64: bigBase64,
      })
    ).rejects.toThrow("5 MB");
  });

  it("accepts a document within 5 MB", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const smallBase64 = Buffer.alloc(100).toString("base64");
    const result = await caller.media.uploadDoc({
      filename: "ok.pdf",
      contentType: "application/pdf",
      base64: smallBase64,
    });
    expect(result.url).toBeTruthy();
  });
});

// ─── 24-hour Upload Rate Limits ───────────────────────────────────────────────

describe("24-hour upload rate limits", () => {
  it("blocks a third video post within 24h", async () => {
    const { countUserPostsByTypeInWindow } = await import("./db");
    vi.mocked(countUserPostsByTypeInWindow).mockResolvedValueOnce(2); // already used 2 (limit is 2)
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(
      caller.posts.create({ text: "test", mediaUrl: "https://example.com/v.mp4", mediaType: "video" })
    ).rejects.toThrow("Today's limit has been reached, upload again after 24 hrs., due to space control we do have limit system for while.");
  });

  it("blocks a 4th photo post within 24h", async () => {
    const { countUserPostsByTypeInWindow } = await import("./db");
    vi.mocked(countUserPostsByTypeInWindow).mockResolvedValueOnce(3); // already used 3 (limit is 3)
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(
      caller.posts.create({ text: "test", mediaUrl: "https://example.com/p.jpg", mediaType: "image" })
    ).rejects.toThrow("Today's limit has been reached, upload again after 24 hrs., due to space control we do have limit system for while.");
  });

  it("blocks a 13th audio post within 24h", async () => {
    const { countUserPostsByTypeInWindow } = await import("./db");
    vi.mocked(countUserPostsByTypeInWindow).mockResolvedValueOnce(12); // already used 12 (limit is 12)
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(
      caller.posts.create({ text: "test", audioUrl: "https://example.com/a.mp3" })
    ).rejects.toThrow("Today's limit has been reached, upload again after 24 hrs., due to space control we do have limit system for while.");
  });

  it("blocks a third doc post within 24h", async () => {
    const { countUserPostsByTypeInWindow } = await import("./db");
    vi.mocked(countUserPostsByTypeInWindow).mockResolvedValueOnce(2); // already used 2 (limit is 2)
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(
      caller.posts.create({ text: "test", docUrl: "https://example.com/f.pdf" })
    ).rejects.toThrow("Today's limit has been reached, upload again after 24 hrs., due to space control we do have limit system for while.");
  });

  it("allows unlimited text-only posts", async () => {
    const { createPost } = await import("./db");
    // Text-only posts have no media type / audioUrl / docUrl so no quota check fires
    vi.mocked(createPost).mockResolvedValueOnce(99);
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.posts.create({ text: "Just a text post" });
    expect(result.postId).toBe(99);
  });

  it("blocks a 4th live stream within 24h", async () => {
    const { countUserLiveStreamsInWindow } = await import("./db");
    vi.mocked(countUserLiveStreamsInWindow).mockResolvedValueOnce(3); // already used 3
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(caller.live.create({ title: "Stream 4" })).rejects.toThrow("Today's limit has been reached, upload again after 24 hrs., due to space control we do have limit system for while.");
  });
});
