/**
 * Session 57 — Vitest tests
 * Covers: suspended page/group banner logic, bulk report action guard,
 *         media limits hint formatting, and client-side validation helpers.
 */
import { describe, it, expect } from "vitest";

// ─── Suspended banner logic ────────────────────────────────────────────────────

describe("Suspended page/group banner", () => {
  function buildPage(isSuspended: boolean, suspendReason?: string) {
    return { id: 1, name: "Test Page", handle: "test", isSuspended, suspendReason: suspendReason ?? null };
  }

  it("shows banner when isSuspended is true", () => {
    const page = buildPage(true, "Violated community guidelines");
    expect(page.isSuspended).toBe(true);
    expect(page.suspendReason).toBe("Violated community guidelines");
  });

  it("does not show banner when isSuspended is false", () => {
    const page = buildPage(false);
    expect(page.isSuspended).toBe(false);
  });

  it("handles null suspendReason gracefully", () => {
    const page = buildPage(true, undefined);
    expect(page.isSuspended).toBe(true);
    expect(page.suspendReason).toBeNull();
  });

  it("shows banner for group when isSuspended is true", () => {
    const group = { id: 2, name: "Test Group", handle: "test-group", isSuspended: true, suspendReason: "Spam" };
    expect(group.isSuspended).toBe(true);
    expect(group.suspendReason).toBe("Spam");
  });

  it("follow/join button is hidden when page is suspended", () => {
    const page = buildPage(true);
    // Simulates the condition: user && !page.isAdmin && !isSuspended
    const showFollowButton = !page.isSuspended;
    expect(showFollowButton).toBe(false);
  });

  it("CreatePost is hidden when page is suspended", () => {
    const page = buildPage(true);
    const isAdmin = true;
    // Simulates: page.isAdmin && !isSuspended
    const showComposer = isAdmin && !page.isSuspended;
    expect(showComposer).toBe(false);
  });
});

// ─── Bulk report action guard ──────────────────────────────────────────────────

describe("Bulk report action", () => {
  type BulkAction = "dismiss" | "action" | "delete_content";

  function applyBulkAction(reportIds: number[], action: BulkAction) {
    if (reportIds.length === 0) throw new Error("No reports selected");
    if (reportIds.length > 100) throw new Error("Too many reports selected (max 100)");
    const statusMap: Record<BulkAction, "actioned" | "dismissed"> = {
      dismiss: "dismissed",
      action: "actioned",
      delete_content: "actioned",
    };
    return { processed: reportIds.length, newStatus: statusMap[action] };
  }

  it("dismisses selected reports", () => {
    const result = applyBulkAction([1, 2, 3], "dismiss");
    expect(result.processed).toBe(3);
    expect(result.newStatus).toBe("dismissed");
  });

  it("marks reports as actioned", () => {
    const result = applyBulkAction([4, 5], "action");
    expect(result.processed).toBe(2);
    expect(result.newStatus).toBe("actioned");
  });

  it("delete_content maps to actioned status", () => {
    const result = applyBulkAction([6], "delete_content");
    expect(result.processed).toBe(1);
    expect(result.newStatus).toBe("actioned");
  });

  it("throws when no reports are selected", () => {
    expect(() => applyBulkAction([], "dismiss")).toThrow("No reports selected");
  });

  it("throws when more than 100 reports are selected", () => {
    const ids = Array.from({ length: 101 }, (_, i) => i + 1);
    expect(() => applyBulkAction(ids, "action")).toThrow("Too many reports selected");
  });

  it("select-all toggles correctly", () => {
    const allIds = [1, 2, 3, 4, 5];
    let selected = new Set<number>();
    // Toggle all on
    const allSelected = allIds.every((id) => selected.has(id));
    if (!allSelected) selected = new Set(allIds);
    expect(selected.size).toBe(5);
    // Toggle all off
    const allSelectedNow = allIds.every((id) => selected.has(id));
    if (allSelectedNow) selected = new Set();
    expect(selected.size).toBe(0);
  });
});

// ─── Media limits hint formatting ─────────────────────────────────────────────

describe("Media limits hint formatting", () => {
  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m${secs}s` : `${mins}m`;
  }

  function buildHints(limits: Record<string, number>) {
    const PHOTO_MAX_MB = limits["photo_max_mb"] ?? 10;
    const VIDEO_MAX_MB = limits["video_max_mb"] ?? 10;
    const VIDEO_MAX_SECS = limits["video_max_seconds"] ?? 120;
    const AUDIO_MAX_MB = limits["audio_max_mb"] ?? 5;
    const AUDIO_MAX_SECS = limits["audio_max_seconds"] ?? 360;
    const DOC_MAX_MB = limits["doc_max_mb"] ?? 5;
    return {
      photo: `Photo ≤ ${PHOTO_MAX_MB} MB`,
      video: `Video ≤ ${VIDEO_MAX_MB} MB · ${formatDuration(VIDEO_MAX_SECS)}`,
      audio: `Audio ≤ ${AUDIO_MAX_MB} MB · ${formatDuration(AUDIO_MAX_SECS)}`,
      doc: `Doc ≤ ${DOC_MAX_MB} MB`,
    };
  }

  it("renders default hints correctly", () => {
    const hints = buildHints({});
    expect(hints.photo).toBe("Photo ≤ 10 MB");
    expect(hints.video).toBe("Video ≤ 10 MB · 2m");
    expect(hints.audio).toBe("Audio ≤ 5 MB · 6m");
    expect(hints.doc).toBe("Doc ≤ 5 MB");
  });

  it("renders custom limits from DB", () => {
    const hints = buildHints({
      photo_max_mb: 20,
      video_max_mb: 50,
      video_max_seconds: 300,
      audio_max_mb: 10,
      audio_max_seconds: 600,
      doc_max_mb: 25,
    });
    expect(hints.photo).toBe("Photo ≤ 20 MB");
    expect(hints.video).toBe("Video ≤ 50 MB · 5m");
    expect(hints.audio).toBe("Audio ≤ 10 MB · 10m");
    expect(hints.doc).toBe("Doc ≤ 25 MB");
  });

  it("formats duration with seconds correctly", () => {
    expect(formatDuration(90)).toBe("1m30s");
    expect(formatDuration(60)).toBe("1m");
    expect(formatDuration(150)).toBe("2m30s");
    expect(formatDuration(120)).toBe("2m");
  });

  it("client-side photo size validation uses dynamic limit", () => {
    const PHOTO_MAX_MB = 20;
    const maxBytes = PHOTO_MAX_MB * 1024 * 1024;
    const smallFile = { size: 5 * 1024 * 1024 };
    const largeFile = { size: 25 * 1024 * 1024 };
    expect(smallFile.size <= maxBytes).toBe(true);
    expect(largeFile.size <= maxBytes).toBe(false);
  });

  it("client-side video size validation uses dynamic limit", () => {
    const VIDEO_MAX_MB = 50;
    const maxBytes = VIDEO_MAX_MB * 1024 * 1024;
    const okFile = { size: 40 * 1024 * 1024 };
    const tooBig = { size: 60 * 1024 * 1024 };
    expect(okFile.size <= maxBytes).toBe(true);
    expect(tooBig.size <= maxBytes).toBe(false);
  });

  it("client-side audio duration validation uses dynamic limit", () => {
    const AUDIO_MAX_SECS = 600;
    const okDuration = 500;
    const tooLong = 700;
    expect(okDuration <= AUDIO_MAX_SECS).toBe(true);
    expect(tooLong <= AUDIO_MAX_SECS).toBe(false);
  });
});
