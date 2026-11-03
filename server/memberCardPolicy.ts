import {
  memberCardSharePath,
  type MemberCardDisplay,
} from "../shared/memberCard";

export type CardRecord = {
  userId: number;
  memberNumber: string;
  shareToken: string;
  enabled: boolean;
  showName: boolean;
  showPhoto: boolean;
  appearance: "classic" | "dark";
};

type CardProfile = {
  name: string | null;
  avatar: string | null;
  suspendedUntil?: Date | string | null;
};

export function isCardAccountActive(
  profile: CardProfile | null | undefined,
  now = Date.now()
): boolean {
  if (!profile) return false;
  if (!profile.suspendedUntil) return true;
  const until = new Date(profile.suspendedUntil).getTime();
  return Number.isFinite(until) && until <= now;
}

export function canViewSharedCard(
  card: CardRecord | null | undefined,
  profile: CardProfile | null | undefined,
  blocked = false
): boolean {
  return !!card?.enabled && isCardAccountActive(profile) && !blocked;
}

/** Explicit allowlist: never return an entire user or storage record publicly. */
export function projectMemberCard(
  card: CardRecord,
  profile: CardProfile
): MemberCardDisplay {
  return {
    displayName: card.showName
      ? profile.name?.trim().slice(0, 100) || "FacingFace member"
      : "FacingFace member",
    memberNumber: card.memberNumber,
    avatar: card.showPhoto ? safeCardAvatar(profile.avatar) : null,
    appearance: card.appearance === "dark" ? "dark" : "classic",
    sharePath: card.enabled ? memberCardSharePath(card.shareToken) : null,
  };
}

function safeCardAvatar(value: string | null): string | null {
  if (!value) return null;
  if (/^\/(?!\/)/.test(value)) return value;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}
