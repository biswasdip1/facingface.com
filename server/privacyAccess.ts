export type Visibility = "public" | "private";
export type ApprovalStatus = "approved" | "pending" | null | undefined;

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

export function joinOutcome(visibility: Visibility | null | undefined, existingStatus: ApprovalStatus): "approved" | "pending" {
  if (existingStatus === "approved") return "approved";
  if (existingStatus === "pending") return "pending";
  return visibility === "private" ? "pending" : "approved";
}

export function shouldAppearInPublicDiscovery(visibility: Visibility | null | undefined): boolean {
  return visibility !== "private";
}
