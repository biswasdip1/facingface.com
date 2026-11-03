import {
  getInactiveReminderSummary,
  getInactiveUsers,
  hasRecentReminder,
  recordInactiveUserReminder,
  INACTIVE_REMINDER_DAYS,
  INACTIVE_REMINDER_REPEAT_DAYS,
} from "./db";
import { getEmailDeliveryConfig, sendInactiveUserReminderEmail } from "./email";

export type InactiveReminderRunResult = {
  startedAt: Date;
  completedAt: Date;
  inactiveUsers: number;
  eligibleUsers: number;
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
  sender: string;
  emailConfigured: boolean;
  errors: string[];
};

function conciseError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").slice(0, 240);
}

/**
 * Sends one reminder at most every 30 days to each user who has been inactive
 * for at least 14 days. A reminder record is written only after SMTP accepts
 * the message, so a failed email remains eligible for a later retry.
 */
export async function sendInactiveUserReminders(): Promise<InactiveReminderRunResult> {
  const startedAt = new Date();
  const emailConfig = getEmailDeliveryConfig();
  const summary = await getInactiveReminderSummary();
  const result: InactiveReminderRunResult = {
    startedAt,
    completedAt: startedAt,
    inactiveUsers: summary.inactiveUsers,
    eligibleUsers: summary.eligibleUsers,
    attempted: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    sender: emailConfig.from,
    emailConfigured: emailConfig.configured,
    errors: [],
  };

  if (!emailConfig.configured) {
    result.failed = 1;
    result.errors.push("SMTP is not configured. Add the Gmail SMTP values in Render before sending reminders.");
    result.completedAt = new Date();
    console.warn("[InactiveUserReminder] Run stopped: SMTP is not configured.");
    return result;
  }

  const inactiveUsers = await getInactiveUsers(
    INACTIVE_REMINDER_DAYS,
    INACTIVE_REMINDER_REPEAT_DAYS,
  );
  result.eligibleUsers = inactiveUsers.length;
  console.info(`[InactiveUserReminder] Starting run for ${inactiveUsers.length} eligible users.`);

  for (const user of inactiveUsers) {
    // Re-check the duplicate guard within the run in case another request or a
    // scheduled process sent a reminder after the candidate list was created.
    if (await hasRecentReminder(user.id, INACTIVE_REMINDER_REPEAT_DAYS)) {
      result.skipped++;
      continue;
    }
    if (!user.email) {
      result.skipped++;
      continue;
    }

    result.attempted++;
    try {
      const receipt = await sendInactiveUserReminderEmail({
        to: user.email,
        name: user.name || "Friend",
      });

      if (receipt.accepted.length === 0 || receipt.rejected.length > 0) {
        throw new Error("SMTP did not accept the reminder recipient.");
      }

      await recordInactiveUserReminder(user.id, user.lastSeenAt);
      result.sent++;
      console.info(`[InactiveUserReminder] Reminder accepted for user ${user.id}.`);
    } catch (error) {
      result.failed++;
      const message = conciseError(error);
      result.errors.push(`User ${user.id}: ${message}`);
      console.error(`[InactiveUserReminder] Delivery failed for user ${user.id}: ${message}`);
    }
  }

  result.completedAt = new Date();
  console.info(
    `[InactiveUserReminder] Run complete — eligible: ${result.eligibleUsers}, sent: ${result.sent}, skipped: ${result.skipped}, failed: ${result.failed}.`,
  );
  return result;
}

export default sendInactiveUserReminders;
