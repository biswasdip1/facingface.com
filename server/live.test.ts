import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    isUserSuspended: vi.fn().mockResolvedValue({ suspended: false }),
    countUserLiveStreamsInWindow: vi.fn().mockResolvedValue(0),
    createLiveStream: vi.fn().mockResolvedValue(42),
    endLiveStream: vi.fn().mockResolvedValue(undefined),
    getLiveStream: vi.fn().mockResolvedValue({
      id: 42,
      hostId: 1,
      title: "Test Stream",
      status: "active",
      viewerCount: 3,
      startedAt: new Date(),
      endedAt: null,
    }),
    getActiveLiveStreams: vi.fn().mockResolvedValue([
      {
        id: 42,
        hostId: 1,
        title: "Active Stream",
        status: "active",
        viewerCount: 5,
        startedAt: new Date(),
        endedAt: null,
      },
    ]),
    getUserById: vi.fn().mockResolvedValue({ id: 1, name: "Test User", avatar: null }),
  };
});

function makeCtx(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-open-id",
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

describe("live.create", () => {
  it("creates a live stream and returns streamId", async () => {
    const caller = appRouter.createCaller(makeCtx());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (caller as any).live.create({ title: "My Live Stream" });
    expect(result.streamId).toBe(42);
  });

  it("creates a live stream with no title", async () => {
    const caller = appRouter.createCaller(makeCtx());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (caller as any).live.create({});
    expect(result.streamId).toBe(42);
  });
});

describe("live.end", () => {
  it("ends a live stream successfully", async () => {
    const caller = appRouter.createCaller(makeCtx());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (caller as any).live.end({ streamId: 42 });
    expect(result.success).toBe(true);
  });
});

describe("live.get", () => {
  it("returns a live stream with host info", async () => {
    const caller = appRouter.createCaller(makeCtx());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (caller as any).live.get({ streamId: 42 });
    expect(result).not.toBeNull();
    expect(result.id).toBe(42);
    expect(result.host?.name).toBe("Test User");
  });

  it("returns null for non-existent stream", async () => {
    const { getLiveStream } = await import("./db");
    vi.mocked(getLiveStream).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (caller as any).live.get({ streamId: 9999 });
    expect(result).toBeNull();
  });
});

describe("live.listActive", () => {
  it("returns active streams with host info", async () => {
    const caller = appRouter.createCaller(makeCtx());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (caller as any).live.listActive();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe("Active Stream");
    expect(result[0].host?.name).toBe("Test User");
  });
});
