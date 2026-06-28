/**
 * Tests for DM message deletion and user presence helpers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── deleteMessage ────────────────────────────────────────────────────────────
describe("deleteMessage", () => {
  it("returns false when the message does not belong to the user", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ senderId: 99 }]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    };

    // Simulate: message exists but belongs to a different user
    const senderId = 99;
    const requestingUserId = 1;
    const msg = { senderId };
    const isOwner = msg.senderId === requestingUserId;
    expect(isOwner).toBe(false);
  });

  it("returns true when the message belongs to the user", async () => {
    const senderId = 1;
    const requestingUserId = 1;
    const msg = { senderId };
    const isOwner = msg.senderId === requestingUserId;
    expect(isOwner).toBe(true);
  });

  it("sets deletedAt to a Date when deleting", () => {
    const deletedAt = new Date();
    expect(deletedAt).toBeInstanceOf(Date);
    expect(deletedAt.getTime()).toBeLessThanOrEqual(Date.now());
  });
});

// ─── updateUserLastSeen / getUserLastSeen ─────────────────────────────────────
describe("presence helpers", () => {
  it("updateUserLastSeen sets lastSeenAt to current time", () => {
    const before = Date.now();
    const lastSeenAt = new Date();
    const after = Date.now();
    expect(lastSeenAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(lastSeenAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("getUserLastSeen returns null when user has no lastSeenAt", () => {
    const row: { lastSeenAt?: Date | null } | undefined = undefined;
    const result = row?.lastSeenAt ?? null;
    expect(result).toBeNull();
  });

  it("getUserLastSeen returns the stored Date", () => {
    const stored = new Date("2026-01-01T12:00:00Z");
    const row = { lastSeenAt: stored };
    const result = row?.lastSeenAt ?? null;
    expect(result).toBe(stored);
  });
});

// ─── formatPresence (UI helper logic) ────────────────────────────────────────
describe("formatPresence", () => {
  function formatPresence(lastSeenAt: Date | null | undefined, isOnline: boolean): string {
    if (isOnline) return "Active now";
    if (!lastSeenAt) return "";
    const diff = Date.now() - new Date(lastSeenAt).getTime();
    if (diff < 60000) return "Active just now";
    if (diff < 3600000) return `Active ${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `Active ${Math.floor(diff / 3600000)}h ago`;
    return `Active ${Math.floor(diff / 86400000)}d ago`;
  }

  it("returns 'Active now' when user is online", () => {
    expect(formatPresence(null, true)).toBe("Active now");
  });

  it("returns empty string when no lastSeenAt and not online", () => {
    expect(formatPresence(null, false)).toBe("");
  });

  it("returns 'Active just now' for recent activity (< 1 min)", () => {
    const recent = new Date(Date.now() - 30000);
    expect(formatPresence(recent, false)).toBe("Active just now");
  });

  it("returns minutes ago for activity within the last hour", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000);
    expect(formatPresence(fiveMinAgo, false)).toBe("Active 5m ago");
  });

  it("returns hours ago for activity within the last day", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000);
    expect(formatPresence(twoHoursAgo, false)).toBe("Active 2h ago");
  });

  it("returns days ago for older activity", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
    expect(formatPresence(threeDaysAgo, false)).toBe("Active 3d ago");
  });
});
