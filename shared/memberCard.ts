export type MemberCardAppearance = "classic" | "dark";

export const MEMBER_CARD_DEFAULTS = {
  enabled: false,
  showName: true,
  showPhoto: false,
  appearance: "classic" as MemberCardAppearance,
};

export type MemberCardDisplay = {
  displayName: string;
  memberNumber: string | null;
  avatar: string | null;
  appearance: MemberCardAppearance;
  sharePath: string | null;
};

/** Public locator only. It must never be treated as an authentication token. */
export const MEMBER_CARD_LINK_PATTERN = /^[a-f0-9]{48}$/;

export function memberCardSharePath(linkId: string): string {
  if (!MEMBER_CARD_LINK_PATTERN.test(linkId))
    throw new Error("Invalid member-card link.");
  return `/member/${linkId}`;
}

export function memberCardInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => Array.from(part)[0])
      .join("")
      .toUpperCase() || "FF"
  );
}
