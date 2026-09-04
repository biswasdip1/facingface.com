import { describe, expect, it } from "vitest";
import { canViewPrivateContent, canViewWallPost, joinOutcome, shouldAppearInPublicDiscovery } from "./privacyAccess";

describe("Page and Public Group privacy policy", () => {
  it("keeps public content visible without a membership record", () => {
    expect(canViewPrivateContent("public", null)).toBe(true);
    expect(shouldAppearInPublicDiscovery("public")).toBe(true);
  });

  it("blocks private content for visitors and pending requests", () => {
    expect(canViewPrivateContent("private", null)).toBe(false);
    expect(canViewPrivateContent("private", "pending")).toBe(false);
    expect(shouldAppearInPublicDiscovery("private")).toBe(false);
  });

  it("permits approved members and administrators to view private content", () => {
    expect(canViewPrivateContent("private", "approved")).toBe(true);
    expect(canViewPrivateContent("private", null, true)).toBe(true);
  });

  it("creates a pending request for a new private Page or Group follower", () => {
    expect(joinOutcome("private", null)).toBe("pending");
    expect(joinOutcome("private", "pending")).toBe("pending");
    expect(joinOutcome("private", "approved")).toBe("approved");
  });

  it("approves a new public follow or join immediately", () => {
    expect(joinOutcome("public", null)).toBe("approved");
  });
});

describe("normal wall-post audience policy", () => {
  const authorId = 101;
  const acceptedFriendId = 202;
  const pendingRequesterId = 303;
  const strangerId = 404;

  it("treats public and legacy posts with no audience value as public", () => {
    expect(canViewWallPost("public", null, authorId)).toBe(true);
    expect(canViewWallPost(undefined, strangerId, authorId)).toBe(true);
    expect(canViewWallPost(null, null, authorId)).toBe(true);
  });

  it("allows the author to view a private wall post", () => {
    expect(canViewWallPost("private", authorId, authorId)).toBe(true);
  });

  it("allows an accepted friend to view a private wall post", () => {
    expect(canViewWallPost("private", acceptedFriendId, authorId, true)).toBe(true);
  });

  it("denies anonymous visitors, strangers, and pending friend requests", () => {
    expect(canViewWallPost("private", null, authorId)).toBe(false);
    expect(canViewWallPost("private", strangerId, authorId, false)).toBe(false);
    expect(canViewWallPost("private", pendingRequesterId, authorId, false)).toBe(false);
  });
});
