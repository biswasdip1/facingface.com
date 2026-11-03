export type Visibility = "public" | "private";
export type ApprovalStatus = "approved" | "pending" | null | undefined;
export type PostAudience = Visibility | null | undefined;

/**
 * Shared visibility policy used by Page and Public Group server routes.
 * Private content is visible only after approval or to an administrator.
 */
export function canViewPrivateContent(
  visibility: Visibility | null | undefined,
  status: ApprovalStatus,
  isAdministrator = false,
): boolean {
  return visibility !== "private" || status === "approved" || isAdministrator;
}

/**
 * Standard wall posts are public by default, including legacy rows that have
 * no audience value. A private post is visible only to its author or an
 * accepted friend; a pending friend request never grants access.
 */
export function canViewWallPost(
  audience: PostAudience,
  viewerId: number | null | undefined,
  authorId: number,
  areApprovedFriends = false,
): boolean {
  return audience !== "private" || viewerId === authorId || areApprovedFriends;
}

export function joinOutcome(visibility: Visibility | null | undefined, existingStatus: ApprovalStatus): "approved" | "pending" {
  if (existingStatus === "approved") return "approved";
  if (existingStatus === "pending") return "pending";
  return visibility === "private" ? "pending" : "approved";
}

export function shouldAppearInPublicDiscovery(visibility: Visibility | null | undefined): boolean {
  return visibility !== "private";
}
