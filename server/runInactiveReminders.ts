import { sendInactiveUserReminders } from "./inactiveUserReminder";

async function main() {
  const result = await sendInactiveUserReminders();
  console.info(JSON.stringify({
    event: "inactive_reminder_run_complete",
    completedAt: result.completedAt.toISOString(),
    eligibleUsers: result.eligibleUsers,
    attempted: result.attempted,
    sent: result.sent,
    skipped: result.skipped,
    failed: result.failed,
    emailConfigured: result.emailConfigured,
  }));

  // A non-zero result makes a scheduled delivery problem visible in Render.
  // Successfully accepted reminders are already recorded and cannot be
  // duplicated by the next scheduled run within the 30-day safeguard period.
  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("[InactiveUserReminder] Unhandled scheduled-run failure:", error);
  process.exit(1);
});
