import { getInactiveUsers, recordInactiveUserReminder, hasRecentReminder } from "./db";
import { sendInactiveUserReminderEmail } from "./email";

/**
 * Send reminder emails to users inactive for 14+ days
 * This function should be called daily via a cron job or scheduled task
 */
export async function sendInactiveUserReminders(): Promise<void> {
  console.log("[InactiveUserReminder] Starting inactive user reminder job...");
  
  try {
    // Get users inactive for 14+ days
    const inactiveUsers = await getInactiveUsers(14);
    console.log(`[InactiveUserReminder] Found ${inactiveUsers.length} inactive users`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const user of inactiveUsers) {
      try {
        // Check if user already received a reminder in the last 30 days
        const hasRecent = await hasRecentReminder(user.id, 30);
        if (hasRecent) {
          console.log(`[InactiveUserReminder] Skipping user ${user.id} - recent reminder already sent`);
          skipCount++;
          continue;
        }
        
        // Skip if no email
        if (!user.email) {
          console.log(`[InactiveUserReminder] Skipping user ${user.id} - no email`);
          skipCount++;
          continue;
        }
        
        // Send email
        await sendInactiveUserReminderEmail({
          to: user.email,
          name: user.name || "Friend",
        });
        
        // Record that we sent the reminder
        await recordInactiveUserReminder(user.id);
        
        console.log(`[InactiveUserReminder] Sent reminder to ${user.email}`);
        successCount++;
      } catch (err) {
        console.error(`[InactiveUserReminder] Error sending reminder to user ${user.id}:`, err);
        errorCount++;
      }
    }
    
    console.log(`[InactiveUserReminder] Job complete - Sent: ${successCount}, Skipped: ${skipCount}, Errors: ${errorCount}`);
  } catch (err) {
    console.error("[InactiveUserReminder] Job failed:", err);
  }
}

// Export for testing
export default sendInactiveUserReminders;
