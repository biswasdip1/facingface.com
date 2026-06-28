import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  insertCallHistory: vi.fn().mockResolvedValue(42),
  getCallHistory: vi.fn().mockResolvedValue([
    {
      id: 1,
      callerId: 10,
      calleeId: 20,
      type: "voice",
      status: "answered",
      startedAt: new Date("2026-01-01T12:00:00Z"),
      endedAt: new Date("2026-01-01T12:05:00Z"),
      duration: 300,
      peerName: "Alice",
      peerAvatar: null,
      peerId: 20,
    },
  ]),
  savePushSubscription: vi.fn().mockResolvedValue(undefined),
  deletePushSubscription: vi.fn().mockResolvedValue(undefined),
  getPushSubscriptionsForUser: vi.fn().mockResolvedValue([
    { endpoint: "https://push.example.com/sub1", p256dh: "abc", auth: "xyz" },
  ]),
}));

import {
  insertCallHistory,
  getCallHistory,
  savePushSubscription,
  deletePushSubscription,
  getPushSubscriptionsForUser,
} from "./db";

// ─── callHistory.log ──────────────────────────────────────────────────────────
describe("callHistory.log", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts a voice call record with answered status", async () => {
    const id = await insertCallHistory({
      callerId: 10,
      calleeId: 20,
      type: "voice",
      status: "answered",
      duration: 300,
      startedAt: new Date(),
    });
    expect(id).toBe(42);
    expect(insertCallHistory).toHaveBeenCalledWith(
      expect.objectContaining({ callerId: 10, calleeId: 20, type: "voice", status: "answered" })
    );
  });

  it("inserts a video call record with missed status", async () => {
    await insertCallHistory({
      callerId: 5,
      calleeId: 7,
      type: "video",
      status: "missed",
      duration: 0,
    });
    expect(insertCallHistory).toHaveBeenCalledWith(
      expect.objectContaining({ type: "video", status: "missed" })
    );
  });

  it("inserts a declined call record", async () => {
    await insertCallHistory({
      callerId: 1,
      calleeId: 2,
      type: "voice",
      status: "declined",
      duration: 0,
    });
    expect(insertCallHistory).toHaveBeenCalledWith(
      expect.objectContaining({ status: "declined" })
    );
  });
});

// ─── callHistory.list ─────────────────────────────────────────────────────────
describe("callHistory.list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns call history rows for a user", async () => {
    const rows = await getCallHistory(10, 30);
    expect(rows).toHaveLength(1);
    expect(rows[0].peerName).toBe("Alice");
    expect(rows[0].duration).toBe(300);
  });

  it("returns empty array when user has no history", async () => {
    (getCallHistory as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    const rows = await getCallHistory(99, 30);
    expect(rows).toHaveLength(0);
  });

  it("passes cursor for pagination", async () => {
    await getCallHistory(10, 10, 5);
    expect(getCallHistory).toHaveBeenCalledWith(10, 10, 5);
  });
});

// ─── push.subscribe ───────────────────────────────────────────────────────────
describe("push.subscribe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves a push subscription for a user", async () => {
    await savePushSubscription(10, "https://push.example.com/sub1", "p256dh_key", "auth_key");
    expect(savePushSubscription).toHaveBeenCalledWith(
      10,
      "https://push.example.com/sub1",
      "p256dh_key",
      "auth_key"
    );
  });

  it("does not throw on duplicate endpoint (upsert-safe)", async () => {
    await expect(
      savePushSubscription(10, "https://push.example.com/sub1", "p256dh_key", "auth_key")
    ).resolves.not.toThrow();
  });
});

// ─── push.unsubscribe ─────────────────────────────────────────────────────────
describe("push.unsubscribe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes a push subscription by endpoint", async () => {
    await deletePushSubscription(10, "https://push.example.com/sub1");
    expect(deletePushSubscription).toHaveBeenCalledWith(10, "https://push.example.com/sub1");
  });
});

// ─── getPushSubscriptionsForUser ──────────────────────────────────────────────
describe("getPushSubscriptionsForUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns subscriptions for a user", async () => {
    const subs = await getPushSubscriptionsForUser(10);
    expect(subs).toHaveLength(1);
    expect(subs[0].endpoint).toBe("https://push.example.com/sub1");
  });

  it("returns empty array when user has no subscriptions", async () => {
    (getPushSubscriptionsForUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    const subs = await getPushSubscriptionsForUser(99);
    expect(subs).toHaveLength(0);
  });
});
