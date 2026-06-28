import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock db helpers ────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getMediaLimits: vi.fn().mockResolvedValue({ video_max_mb: 10, video_max_seconds: 90 }),
    createReel: vi.fn().mockResolvedValue(101),
    getReelsFeed: vi.fn().mockResolvedValue([
      {
        id: 1,
        authorId: 1,
        videoUrl: "/manus-storage/reel-1.mp4",
        thumbnailUrl: null,
        caption: "Test reel",
        duration: 15,
        viewCount: 5,
        likeCount: 2,
        commentCount: 1,
        createdAt: new Date(),
        isLiked: false,
        author: { id: 1, name: "Alice", avatar: null },
      },
    ]),
    toggleReelLike: vi.fn().mockResolvedValue({ liked: true, likeCount: 3 }),
    recordReelView: vi.fn().mockResolvedValue(undefined),
    addReelComment: vi.fn().mockResolvedValue(55),
    getReelComments: vi.fn().mockResolvedValue([
      {
        id: 55,
        reelId: 1,
        authorId: 1,
        content: "Nice reel!",
        createdAt: new Date(),
        author: { id: 1, name: "Alice", avatar: null },
      },
    ]),
    deleteReel: vi.fn().mockResolvedValue(undefined),
  };
});

// ── Mock storage ────────────────────────────────────────────────────────────
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "reels/test.mp4", url: "/manus-storage/reels/test.mp4" }),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeCtx(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-open-id",
      name: "Alice",
      email: "alice@example.com",
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

function makeGuestCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// Minimal 1×1 pixel MP4 (base64) — small enough to pass the size check
const TINY_VIDEO_B64 = "AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tAAAA";

// ── Tests ────────────────────────────────────────────────────────────────────

describe("reels.feed", () => {
  it("returns a list of reels for a guest user", async () => {
    const caller = appRouter.createCaller(makeGuestCtx());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (caller as any).reels.feed({ limit: 10, cursor: null });
    expect(result.reels).toHaveLength(1);
    expect(result.reels[0].caption).toBe("Test reel");
    expect(result.nextCursor).toBeNull(); // only 1 item, limit 10 → no next page
  });

  it("returns a list of reels for an authenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (caller as any).reels.feed({ limit: 5, cursor: null });
    expect(result.reels).toHaveLength(1);
  });
});

describe("reels.upload", () => {
  it("uploads a reel and returns reelId", async () => {
    const caller = appRouter.createCaller(makeCtx());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (caller as any).reels.upload({
      videoBase64: TINY_VIDEO_B64,
      caption: "My first reel",
      duration: 10,
    });
    expect(result.reelId).toBe(101);
  });

  it("rejects a video that exceeds the duration limit", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (caller as any).reels.upload({
        videoBase64: TINY_VIDEO_B64,
        duration: 999, // exceeds 90s limit
      })
    ).rejects.toThrow();
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(makeGuestCtx());
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (caller as any).reels.upload({
        videoBase64: TINY_VIDEO_B64,
        duration: 10,
      })
    ).rejects.toThrow();
  });
});

describe("reels.like", () => {
  it("toggles like on a reel", async () => {
    const caller = appRouter.createCaller(makeCtx());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (caller as any).reels.like({ reelId: 1 });
    expect(result.liked).toBe(true);
    expect(result.likeCount).toBe(3);
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(makeGuestCtx());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect((caller as any).reels.like({ reelId: 1 })).rejects.toThrow();
  });
});

describe("reels.view", () => {
  it("records a view successfully", async () => {
    const caller = appRouter.createCaller(makeCtx());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (caller as any).reels.view({ reelId: 1 });
    expect(result.ok).toBe(true);
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(makeGuestCtx());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect((caller as any).reels.view({ reelId: 1 })).rejects.toThrow();
  });
});

describe("reels.addComment", () => {
  it("adds a comment and returns commentId", async () => {
    const caller = appRouter.createCaller(makeCtx());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (caller as any).reels.addComment({ reelId: 1, content: "Great reel!" });
    expect(result.commentId).toBe(55);
  });

  it("rejects empty comment content", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (caller as any).reels.addComment({ reelId: 1, content: "" })
    ).rejects.toThrow();
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(makeGuestCtx());
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (caller as any).reels.addComment({ reelId: 1, content: "Hi" })
    ).rejects.toThrow();
  });
});

describe("reels.getComments", () => {
  it("returns comments for a reel (public)", async () => {
    const caller = appRouter.createCaller(makeGuestCtx());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comments = await (caller as any).reels.getComments({ reelId: 1 });
    expect(comments).toHaveLength(1);
    expect(comments[0].content).toBe("Nice reel!");
  });
});

describe("reels.delete", () => {
  it("deletes a reel owned by the user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (caller as any).reels.delete({ reelId: 1 });
    expect(result.ok).toBe(true);
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(makeGuestCtx());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect((caller as any).reels.delete({ reelId: 1 })).rejects.toThrow();
  });
});
