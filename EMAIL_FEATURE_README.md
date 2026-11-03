# Inactive User Email Reminder Feature

## Overview
This feature automatically sends reminder emails to users who have been inactive for 14+ days, encouraging them to return to the FacingFace platform.

## Implementation Details

### Database Changes
- **New Table:** `inactiveUserReminders` (PostgreSQL)
  - Tracks which users have received reminders and when
  - Prevents duplicate reminders within 30 days
  - Stores last activity timestamp for reference

### New Files
1. **`server/inactiveUserReminder.ts`**
   - Core job logic for finding and emailing inactive users
   - Handles error logging and success tracking
   - Can be triggered manually or via scheduled tasks

2. **`drizzle/0014_inactive_user_reminders.sql`**
   - PostgreSQL migration for the new table
   - Includes indexes for performance

### Modified Files
1. **`drizzle/schema.ts`**
   - Added `inactiveUserReminders` table definition with TypeScript types

2. **`server/db.ts`**
   - Added `getInactiveUsers()` - finds users inactive for N days
   - Added `recordInactiveUserReminder()` - logs that reminder was sent
   - Added `hasRecentReminder()` - prevents duplicate reminders

3. **`server/email.ts`**
   - Added `sendInactiveUserReminderEmail()` - sends formatted HTML email

4. **`server/routers.ts`**
   - Added `inactiveRemindersRouter` with `trigger` mutation
   - Only super admins can trigger the job manually

## How It Works

### Automatic Workflow
1. **Find Inactive Users:** Query users with no activity for 14+ days
2. **Check Recent Reminders:** Skip if reminder sent in last 30 days
3. **Send Email:** Deliver personalized re-engagement email
4. **Record Reminder:** Log in database to prevent duplicates
5. **Report Results:** Console logs show success/skip/error counts

### Manual Trigger (Admin)
Super admins can manually trigger the job via the tRPC endpoint:
```typescript
client.inactiveReminders.trigger.mutate()
```

### Email Template
- Professional HTML email with FacingFace branding
- Personalized greeting with user's name
- Call-to-action button to return to platform
- Mobile-responsive design

## Configuration

### Environment Variables
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP port (default: 587)
- `SMTP_USER` - SMTP authentication username
- `SMTP_PASS` - SMTP authentication password
- `SMTP_SECURE` - Use TLS (true/false)
- `SMTP_FROM` - From email address (default: noreply@facingface.com)

### Fallback
If no SMTP credentials are provided, the system uses Ethereal (test email service) for development.

## Deployment Steps

1. **Extract the zip file** to your project directory
2. **Install dependencies** (if needed):
   ```bash
   npm install
   ```
3. **Run database migration**:
   ```bash
   npm run db:push
   ```
4. **Set environment variables** for SMTP (production only)
5. **Deploy to Render.com** or your hosting platform

## Testing

### Manual Test
1. Log in as super admin
2. Call the `inactiveReminders.trigger` endpoint
3. Check server logs for results
4. Verify emails in Ethereal (dev) or email inbox (production)

### Database Check
```sql
SELECT * FROM "inactiveUserReminders" ORDER BY "emailSentAt" DESC LIMIT 10;
```

## Performance Considerations

- **Batch Processing:** Processes up to 100 inactive users per job run
- **Database Indexes:** Optimized queries with indexes on userId and emailSentAt
- **Duplicate Prevention:** 30-day window prevents email fatigue
- **Error Handling:** Continues processing even if individual emails fail

## Future Enhancements

- [ ] Scheduled cron job (daily at 2 AM UTC)
- [ ] Configurable inactivity threshold (currently 14 days)
- [ ] A/B testing different email templates
- [ ] Track email open rates and click-through rates
- [ ] Segment users by activity level
- [ ] Multi-language email support

## Support

For issues or questions, check:
- Server logs in `.manus-logs/devserver.log`
- Database migration status: `drizzle/meta/_journal.json`
- Email preview URLs in console (development mode)
