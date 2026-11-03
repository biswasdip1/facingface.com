import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveStream, User } from "../drizzle/schema";
import {
  LIVE_STREAM_DURATION_MS,
  LIVE_STREAM_WARNING_MS,
  formatLiveStreamTime,
  liveStreamDeadline,
  liveStreamTimeLeft,
} from "../shared/liveStream";
import {
  applyLiveIce,
  liveCameraError,
} from "../client/src/lib/liveStreamMedia";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { endLiveStreamSession, registerLiveStreamDeadline } from "./liveStream";
import { appRouter } from "./routers";

// Preserve all unrelated router imports, following the existing live.test.ts.
vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    isUserSuspended: vi.fn(),
    countUserLiveStreamsInWindow: vi.fn(),
    createLiveStream: vi.fn(),
    endLiveStream: vi.fn(),
    getLiveStream: vi.fn(),
    getActiveLiveStreams: vi.fn(),
    getUserById: vi.fn(),
  };
});

// Do not load or initialize real Socket.IO sessions or deadline timers.
vi.mock("./liveStream", () => ({
  registerLiveStreamDeadline: vi.fn(),
  endLiveStreamSession: vi.fn(),
}));

const STARTED_AT = new Date("2026-11-03T12:00:00.000Z");
const NOW = STARTED_AT.getTime() + 60_000;

function makeUser(id = 1): User {
  return {
    id,
    openId: `private-open-id-${id}`,
    name: `Host ${id}`,
    email: `private-${id}@example.com`,
    passwordHash: "private-password-hash",
    emailVerified: true,
    verificationToken: "private-verification-token",
    loginMethod: "email",
    role: "user",
    bio: "private biography",
    avatar: `/avatar-${id}.png`,
    coverPhoto: "/private-cover.png",
    hometown: "private hometown",
    currentLocation: "private location",
    currentRole: "private occupation",
    phone: "private phone",
    phoneVerified: true,
    website: "https://private.example.com",
    youtubeChannel: "private channel",
    birthDay: 1,
    birthMonth: 1,
    hobby: "private hobby",
    coverCropY: 50,
    createdAt: STARTED_AT,
    updatedAt: STARTED_AT,
    lastSignedIn: STARTED_AT,
    suspendedUntil: null,
    suspendReason: null,
    violationCount: 0,
    isVerified: true,
    lastCallsSeenAt: STARTED_AT,
    lastSeenAt: STARTED_AT,
  };
}

function makeStream(overrides: Partial<LiveStream> = {}): LiveStream {
  return {
    id: 42,
    hostId: 1,
    title: "Test Stream",
    status: "active",
    viewerCount: 3,
    startedAt: STARTED_AT,
    endedAt: null,
    ...overrides,
  };
}

function makeCtx(user: User | null = makeUser()): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function expectNoStreamWrite() {
  expect(db.createLiveStream).not.toHaveBeenCalled();
  expect(db.endLiveStream).not.toHaveBeenCalled();
  expect(registerLiveStreamDeadline).not.toHaveBeenCalled();
  expect(endLiveStreamSession).not.toHaveBeenCalled();
}

function expectPublicHost(host: unknown, user: User) {
  expect(host).toEqual({
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    isVerified: user.isVerified,
  });
  expect(Object.keys(host as Record<string, unknown>).sort()).toEqual([
    "avatar",
    "id",
    "isVerified",
    "name",
  ]);
  const serialized = JSON.stringify(host);
  for (const secret of [
    user.email,
    user.openId,
    user.passwordHash,
    user.verificationToken,
    user.phone,
    user.bio,
    user.currentLocation,
  ]) {
    expect(serialized).not.toContain(secret);
  }
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  vi.mocked(db.isUserSuspended).mockResolvedValue({ suspended: false });
  vi.mocked(db.countUserLiveStreamsInWindow).mockResolvedValue(0);
  vi.mocked(db.createLiveStream).mockResolvedValue(42);
  vi.mocked(db.endLiveStream).mockResolvedValue(undefined);
  // Respect requested IDs: missing-stream tests must not receive fixture 42.
  vi.mocked(db.getLiveStream).mockImplementation(async streamId =>
    streamId === 42 ? makeStream() : undefined
  );
  vi.mocked(db.getActiveLiveStreams).mockResolvedValue([makeStream()]);
  vi.mocked(db.getUserById).mockImplementation(async id => makeUser(id));
  vi.mocked(endLiveStreamSession).mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("live stream five-minute deadline helpers", () => {
  it("uses exactly five minutes and a thirty-second warning", () => {
    expect(LIVE_STREAM_DURATION_MS).toBe(300_000);
    expect(LIVE_STREAM_WARNING_MS).toBe(30_000);
    expect(formatLiveStreamTime(LIVE_STREAM_DURATION_MS)).toBe("05:00");
    expect(formatLiveStreamTime(LIVE_STREAM_WARNING_MS)).toBe("00:30");
  });

  it.each([
    [0, "00:00"],
    [-1, "00:00"],
    [-60_000, "00:00"],
    [1, "00:01"],
    [1_001, "00:02"],
    [59_001, "01:00"],
    [299_001, "05:00"],
    [300_001, "05:01"],
  ])(
    "formats %i ms as %s, rounding up and clamping negatives",
    (ms, expected) => {
      expect(formatLiveStreamTime(ms)).toBe(expected);
    }
  );

  it.each([STARTED_AT, STARTED_AT.toISOString(), STARTED_AT.getTime()])(
    "derives the same deadline from a date, string, or number: %s",
    startedAt => {
      expect(liveStreamDeadline(startedAt)).toBe(
        STARTED_AT.getTime() + 300_000
      );
    }
  );

  it.each([new Date(NaN), "not-a-date", "", NaN, Infinity, -Infinity])(
    "returns safe zero for an invalid start: %s",
    startedAt => {
      expect(liveStreamDeadline(startedAt)).toBe(0);
    }
  );

  it("does not renew a deadline when time passes or a viewer rejoins", () => {
    const deadline = liveStreamDeadline(STARTED_AT);
    vi.mocked(Date.now).mockReturnValue(NOW + 120_000);
    expect(liveStreamDeadline(STARTED_AT)).toBe(deadline);
    expect(liveStreamTimeLeft(deadline)).toBe(120_000);
  });

  it("bounds remaining time between zero and five minutes", () => {
    const deadline = liveStreamDeadline(STARTED_AT);
    expect(liveStreamTimeLeft(deadline, STARTED_AT.getTime() - 60_000)).toBe(
      300_000
    );
    expect(liveStreamTimeLeft(deadline, STARTED_AT.getTime())).toBe(300_000);
    expect(liveStreamTimeLeft(deadline)).toBe(240_000);
    expect(liveStreamTimeLeft(deadline, deadline - 30_000)).toBe(30_000);
    expect(liveStreamTimeLeft(deadline, deadline)).toBe(0);
    expect(liveStreamTimeLeft(deadline, deadline + 1)).toBe(0);
    expect(liveStreamTimeLeft(0)).toBe(0);
  });
});

describe("live media ICE handling", () => {
  it("keeps ICE queued until remote description exists, then drains in order", async () => {
    const candidates: RTCIceCandidateInit[] = [
      { candidate: "candidate:first" },
      { candidate: "candidate:second" },
      { candidate: "candidate:third" },
    ];
    const pending = [...candidates];
    const peer = {
      remoteDescription: null as RTCSessionDescriptionInit | null,
      addIceCandidate: vi.fn().mockResolvedValue(undefined),
    };
    await applyLiveIce(peer as unknown as RTCPeerConnection, pending);
    expect(peer.addIceCandidate).not.toHaveBeenCalled();
    expect(pending).toEqual(candidates);

    peer.remoteDescription = { type: "offer", sdp: "remote-description" };
    await applyLiveIce(peer as unknown as RTCPeerConnection, pending);
    expect(peer.addIceCandidate.mock.calls).toEqual(
      candidates.map(candidate => [candidate])
    );
    expect(pending).toEqual([]);
    await applyLiveIce(peer as unknown as RTCPeerConnection, pending);
    expect(peer.addIceCandidate).toHaveBeenCalledTimes(candidates.length);
  });

  it("does not lose subsequent ICE when one candidate is rejected", async () => {
    const candidates = [
      { candidate: "candidate:first" },
      { candidate: "candidate:rejected" },
      { candidate: "candidate:third" },
    ];
    const pending = [...candidates];
    const peer = {
      remoteDescription: { type: "answer", sdp: "remote-description" },
      addIceCandidate: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("late ICE"))
        .mockResolvedValueOnce(undefined),
    };
    await expect(
      applyLiveIce(peer as unknown as RTCPeerConnection, pending)
    ).resolves.toBeUndefined();
    expect(peer.addIceCandidate.mock.calls).toEqual(
      candidates.map(candidate => [candidate])
    );
    expect(pending).toEqual([]);
  });
});

describe("live camera error messages", () => {
  it("handles native DOMException and cross-realm permission names", () => {
    expect(
      liveCameraError(
        new DOMException("Private device details", "NotAllowedError")
      )
    ).toContain("permission was denied");
    expect(liveCameraError({ name: "NotAllowedError" })).toContain(
      "permission was denied"
    );
  });
  it.each(["NotAllowedError", "SecurityError"])(
    "explains permissions for %s",
    name => {
      const error = new Error("private device details");
      error.name = name;
      expect(liveCameraError(error)).toBe(
        "Camera or microphone permission was denied. Allow both in your browser's site settings, then try again."
      );
    }
  );

  it.each([
    [
      "NotFoundError",
      "No camera or microphone was found. Connect both before going live.",
    ],
    [
      "NotReadableError",
      "Your camera or microphone is busy. Close other apps using it, then try again.",
    ],
  ])("explains the device problem for %s", (name, message) => {
    const error = new Error("private device details");
    error.name = name;
    expect(liveCameraError(error)).toBe(message);
  });

  it.each([
    new Error("private device details"),
    null,
    undefined,
    "unexpected",
    { name: "unexpected" },
  ])("safely provides generic guidance for %s", error => {
    expect(liveCameraError(error)).toBe(
      "Could not start your camera and microphone. Check their permissions and connection, then try again."
    );
  });
});

describe("live API create protections and authoritative deadline", () => {
  it("requires authentication before any database work", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.live.create({ title: "Anonymous" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.isUserSuspended).not.toHaveBeenCalled();
    expect(db.countUserLiveStreamsInWindow).not.toHaveBeenCalled();
    expect(db.getLiveStream).not.toHaveBeenCalled();
    expectNoStreamWrite();
  });

  it("keeps account suspension enforcement ahead of quota/create", async () => {
    vi.mocked(db.isUserSuspended).mockResolvedValueOnce({
      suspended: true,
      until: STARTED_AT,
      reason: "Suspended",
    });
    const caller = appRouter.createCaller(makeCtx(makeUser(7)));
    await expect(caller.live.create({})).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("suspended"),
    });
    expect(db.isUserSuspended).toHaveBeenCalledWith(7);
    expect(db.countUserLiveStreamsInWindow).not.toHaveBeenCalled();
    expectNoStreamWrite();
  });

  it.each([3, 4])(
    "keeps the existing three-per-24-hour quota at count %i",
    async count => {
      vi.mocked(db.countUserLiveStreamsInWindow).mockResolvedValueOnce(count);
      const caller = appRouter.createCaller(makeCtx(makeUser(7)));
      await expect(caller.live.create({})).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
        message: expect.stringContaining("24 hrs."),
      });
      // One argument preserves the DB helper's default rolling 24-hour window.
      expect(db.countUserLiveStreamsInWindow).toHaveBeenCalledWith(7);
      expectNoStreamWrite();
    }
  );

  it("allows the third stream and registers the persisted start, not request time", async () => {
    vi.mocked(db.countUserLiveStreamsInWindow).mockResolvedValueOnce(2);
    const stream = makeStream({ hostId: 7 });
    vi.mocked(db.getLiveStream).mockResolvedValueOnce(stream);
    const caller = appRouter.createCaller(makeCtx(makeUser(7)));
    const result = await caller.live.create({ title: "My Live Stream" });
    expect(db.createLiveStream).toHaveBeenCalledWith(7, "My Live Stream");
    expect(db.getLiveStream).toHaveBeenCalledWith(42);
    expect(registerLiveStreamDeadline).toHaveBeenCalledTimes(1);
    expect(registerLiveStreamDeadline).toHaveBeenCalledWith(stream);
    expect(result).toEqual({
      streamId: 42,
      durationMs: 300_000,
      expiresAt: STARTED_AT.getTime() + 300_000,
    });
    expect(result.expiresAt).not.toBe(NOW + 300_000);
  });

  it("accepts an omitted title", async () => {
    await appRouter.createCaller(makeCtx()).live.create({});
    expect(db.createLiveStream).toHaveBeenCalledWith(1, undefined);
  });

  it("accepts a 200-character title", async () => {
    const title = "x".repeat(200);
    await appRouter.createCaller(makeCtx()).live.create({ title });
    expect(db.createLiveStream).toHaveBeenCalledWith(1, title);
  });

  it("rejects a title over 200 characters without writing", async () => {
    await expect(
      appRouter.createCaller(makeCtx()).live.create({ title: "x".repeat(201) })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expectNoStreamWrite();
  });
});

describe("live API end ownership and idempotent delegation", () => {
  it("requires authentication", async () => {
    await expect(
      appRouter.createCaller(makeCtx(null)).live.end({ streamId: 42 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.getLiveStream).not.toHaveBeenCalled();
    expectNoStreamWrite();
  });

  it("does not mutate or end another host's stream", async () => {
    await expect(
      appRouter.createCaller(makeCtx(makeUser(2))).live.end({ streamId: 42 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getLiveStream).toHaveBeenCalledWith(42);
    expectNoStreamWrite();
  });

  it("does not write for a missing stream", async () => {
    await expect(
      appRouter.createCaller(makeCtx()).live.end({ streamId: 9999 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.getLiveStream).toHaveBeenCalledWith(9999);
    expectNoStreamWrite();
  });

  it("routes the owner's end through session cleanup without a duplicate DB write", async () => {
    const result = await appRouter
      .createCaller(makeCtx())
      .live.end({ streamId: 42 });
    expect(result).toEqual({ success: true });
    expect(endLiveStreamSession).toHaveBeenCalledTimes(1);
    expect(endLiveStreamSession).toHaveBeenCalledWith(42, 1);
    expect(db.endLiveStream).not.toHaveBeenCalled();
  });

  it("safely accepts an already-ended stream owned by the caller", async () => {
    vi.mocked(db.getLiveStream).mockResolvedValue(
      makeStream({ status: "ended", endedAt: new Date(NOW) })
    );
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.live.end({ streamId: 42 })).resolves.toEqual({
      success: true,
    });
    await expect(caller.live.end({ streamId: 42 })).resolves.toEqual({
      success: true,
    });
    expect(endLiveStreamSession).toHaveBeenNthCalledWith(1, 42, 1);
    expect(endLiveStreamSession).toHaveBeenNthCalledWith(2, 42, 1);
    expect(db.endLiveStream).not.toHaveBeenCalled();
  });
});

describe("public live API projection", () => {
  it("get exposes only minimal host fields and the persisted expiry", async () => {
    const result = await appRouter
      .createCaller(makeCtx(null))
      .live.get({ streamId: 42 });
    expect(result).not.toBeNull();
    expect(result?.id).toBe(42);
    expect(result?.expiresAt).toBe(STARTED_AT.getTime() + 300_000);
    expectPublicHost(result?.host, makeUser());
    expect(db.getLiveStream).toHaveBeenCalledWith(42);
    expect(db.getUserById).toHaveBeenCalledWith(1);
    expectNoStreamWrite();
  });

  it("get returns null for the requested missing stream without a host lookup", async () => {
    await expect(
      appRouter.createCaller(makeCtx(null)).live.get({ streamId: 9999 })
    ).resolves.toBeNull();
    expect(db.getUserById).not.toHaveBeenCalled();
  });

  it("listActive projects each stream's own host, never a whole user record", async () => {
    const second = makeStream({
      id: 43,
      hostId: 2,
      startedAt: new Date(STARTED_AT.getTime() + 10_000),
    });
    vi.mocked(db.getActiveLiveStreams).mockResolvedValueOnce([
      makeStream(),
      second,
    ]);
    const result = await appRouter
      .createCaller(makeCtx(null))
      .live.listActive();
    expect(result).toHaveLength(2);
    expect(result.map(stream => stream.id)).toEqual([42, 43]);
    expectPublicHost(result[0].host, makeUser(1));
    expectPublicHost(result[1].host, makeUser(2));
    expect(result[0].expiresAt).toBe(STARTED_AT.getTime() + 300_000);
    expect(result[1].expiresAt).toBe(second.startedAt.getTime() + 300_000);
    expect(db.getUserById).toHaveBeenNthCalledWith(1, 1);
    expect(db.getUserById).toHaveBeenNthCalledWith(2, 2);
    expectNoStreamWrite();
  });

  it("handles a missing host without leaking another user's information", async () => {
    vi.mocked(db.getUserById).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx(null));
    expect((await caller.live.get({ streamId: 42 }))?.host).toBeNull();
    expect((await caller.live.listActive())[0].host).toBeNull();
  });
});
