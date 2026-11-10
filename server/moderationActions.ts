export type ReportTargetType = "post" | "comment" | "listing";

export type ReportRemovalDependencies = {
  deletePost: (targetId: number) => Promise<void>;
  deleteComment: (targetId: number) => Promise<void>;
  removeListing: (targetId: number, adminId: number) => Promise<void>;
};

/**
 * Executes the action for the exact target named by a reviewed report. This
 * deliberately does not receive a report list, preventing a later or earlier
 * report from being removed by mistake.
 */
export async function removeReportedContent(
  targetType: string,
  targetId: number,
  adminId: number,
  dependencies: ReportRemovalDependencies,
): Promise<void> {
  if (targetType === "post") {
    await dependencies.deletePost(targetId);
    return;
  }
  if (targetType === "comment") {
    await dependencies.deleteComment(targetId);
    return;
  }
  if (targetType === "listing") {
    await dependencies.removeListing(targetId, adminId);
    return;
  }
  throw new Error("Unsupported reported content type.");
}

/** Gmail must accept the recipient before the UI reports a delivered response. */
export function wasRecipientAccepted(accepted: string[], recipient: string): boolean {
  const normalizedRecipient = recipient.trim().toLowerCase();
  return accepted.some((address) => address.trim().toLowerCase() === normalizedRecipient);
}
