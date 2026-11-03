import { describe, expect, it } from "vitest";
import {
  MEMBER_CARD_DEFAULTS,
  MEMBER_CARD_LINK_PATTERN,
  memberCardSharePath,
  memberCardInitials,
} from "../shared/memberCard";
import {
  canViewSharedCard,
  isCardAccountActive,
  projectMemberCard,
  type CardRecord,
} from "./memberCardPolicy";
const card: CardRecord = {
  userId: 42,
  memberNumber: "FF-AB1234567890CDEF",
  shareToken: "a".repeat(48),
  enabled: true,
  showName: true,
  showPhoto: false,
  appearance: "classic",
};
const profile = {
  name: "Test Member",
  avatar: "/media/avatar.jpg",
  suspendedUntil: null,
  email: "private@example.test",
  phone: "private-phone",
  birthDay: 5,
  birthMonth: 10,
  passwordHash: "private-hash",
  verificationToken: "private-verification",
  openId: "private-open-id",
};

describe("optional member-card privacy policy", () => {
  it("defaults to sharing off and no profile photo", () => {
    expect(MEMBER_CARD_DEFAULTS.enabled).toBe(false);
    expect(MEMBER_CARD_DEFAULTS.showPhoto).toBe(false);
  });
  it("exposes only a fixed minimal allowlist", () => {
    const result = projectMemberCard(card, profile);
    expect(Object.keys(result).sort()).toEqual([
      "appearance",
      "avatar",
      "displayName",
      "memberNumber",
      "sharePath",
    ]);
    expect(JSON.stringify(result)).not.toContain("private");
    expect(result.avatar).toBeNull();
  });
  it("requires an explicit selected-photo option", () => {
    expect(
      projectMemberCard({ ...card, showPhoto: true }, profile).avatar
    ).toBe("/media/avatar.jpg");
  });
  it("hides the display name when the owner chooses", () => {
    expect(
      projectMemberCard({ ...card, showName: false }, profile).displayName
    ).toBe("FacingFace member");
  });
  it("never publishes a sharing path for a disabled card", () => {
    expect(
      projectMemberCard({ ...card, enabled: false }, profile).sharePath
    ).toBeNull();
    expect(canViewSharedCard({ ...card, enabled: false }, profile)).toBe(false);
  });
  it("rejects missing users and cards", () => {
    expect(canViewSharedCard(null, profile)).toBe(false);
    expect(canViewSharedCard(card, null)).toBe(false);
  });
  it("rejects currently suspended accounts", () => {
    expect(
      canViewSharedCard(card, {
        ...profile,
        suspendedUntil: new Date(Date.now() + 60_000),
      })
    ).toBe(false);
  });
  it("allows expired suspension without modifying the account", () => {
    expect(
      isCardAccountActive({ ...profile, suspendedUntil: new Date(0) })
    ).toBe(true);
  });
  it("fails closed for malformed suspension dates", () => {
    expect(isCardAccountActive({ ...profile, suspendedUntil: "invalid" })).toBe(
      false
    );
  });
  it("applies a block regardless of card appearance", () => {
    expect(canViewSharedCard(card, profile, true)).toBe(false);
    expect(
      canViewSharedCard({ ...card, appearance: "dark" }, profile, true)
    ).toBe(false);
  });
  it("does not permit script or insecure avatar schemes", () => {
    expect(
      projectMemberCard(
        { ...card, showPhoto: true },
        { ...profile, avatar: "javascript:alert(1)" }
      ).avatar
    ).toBeNull();
    expect(
      projectMemberCard(
        { ...card, showPhoto: true },
        { ...profile, avatar: "http://example.test/photo.png" }
      ).avatar
    ).toBeNull();
  });
  it("uses a fixed same-site route from a strict random locator", () => {
    expect(memberCardSharePath(card.shareToken)).toBe(
      `/member/${"a".repeat(48)}`
    );
    expect(MEMBER_CARD_LINK_PATTERN.test("../../private")).toBe(false);
    expect(() => memberCardSharePath("https://bad.example")).toThrow();
  });
  it("supports initials from Unicode names and a safe empty fallback", () => {
    expect(memberCardInitials("  Test  Member ")).toBe("TM");
    expect(memberCardInitials("बिश्व दीप")).toBe("बद");
    expect(memberCardInitials("")).toBe("FF");
  });
});
