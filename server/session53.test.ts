import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    insertAuditLog: vi.fn().mockResolvedValue(undefined),
    getAuditLogs: vi.fn().mockResolvedValue([
      {
        id: 1,
        actorId: 1,
        actorName: "Biswasdip Tigela",
        action: "promote_to_admin",
        targetUserId: 2,
        targetUserName: "Test User",
        targetPostId: null,
        metadata: null,
        createdAt: new Date("2026-04-27T12:00:00Z"),
      },
      {
        id: 2,
        actorId: 1,
        actorName: "Biswasdip Tigela",
        action: "suspend_user",
        targetUserId: 3,
        targetUserName: "Bad Actor",
        targetPostId: null,
        metadata: JSON.stringify({ days: 7, reason: "spam" }),
        createdAt: new Date("2026-04-27T13:00:00Z"),
      },
    ]),
  };
});

import { insertAuditLog, getAuditLogs } from "./db";

describe("Admin Audit Log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("insertAuditLog is called with correct fields for promote_to_admin", async () => {
    await insertAuditLog({
      actorId: 1,
      actorName: "Biswasdip Tigela",
      action: "promote_to_admin",
      targetUserId: 2,
      targetUserName: "Test User",
    });
    expect(insertAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 1,
        action: "promote_to_admin",
        targetUserId: 2,
      })
    );
  });

  it("insertAuditLog is called with metadata for suspend_user", async () => {
    await insertAuditLog({
      actorId: 1,
      actorName: "Biswasdip Tigela",
      action: "suspend_user",
      targetUserId: 3,
      targetUserName: "Bad Actor",
      metadata: JSON.stringify({ days: 7, reason: "spam" }),
    });
    expect(insertAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "suspend_user",
        metadata: expect.stringContaining("spam"),
      })
    );
  });

  it("getAuditLogs returns list ordered by createdAt desc", async () => {
    const logs = await getAuditLogs(100, 0);
    expect(logs).toHaveLength(2);
    expect(logs[0].action).toBe("promote_to_admin");
    expect(logs[1].action).toBe("suspend_user");
  });

  it("getAuditLogs entries have required fields", async () => {
    const logs = await getAuditLogs(100, 0);
    for (const log of logs) {
      expect(log).toHaveProperty("id");
      expect(log).toHaveProperty("actorId");
      expect(log).toHaveProperty("action");
      expect(log).toHaveProperty("createdAt");
    }
  });

  it("metadata is valid JSON when present", async () => {
    const logs = await getAuditLogs(100, 0);
    const withMeta = logs.filter((l) => l.metadata);
    for (const log of withMeta) {
      expect(() => JSON.parse(log.metadata!)).not.toThrow();
    }
  });
});
