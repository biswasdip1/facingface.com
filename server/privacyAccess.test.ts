import { describe, expect, it } from "vitest";
import { canViewPrivateContent, joinOutcome, shouldAppearInPublicDiscovery } from "./privacyAccess";

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
