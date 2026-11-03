# FacingFace Reminder Email Setup

## What this release changes

This cumulative repair turns the **Email Reminders** administration page into a real delivery control. It no longer displays a simulated success message. The page now reports whether SMTP is configured, shows the real number of inactive and eligible users, provides an owner-only test-email action, and reports the result of each reminder run.

The configured sender is:

> **FacingFace `<direct.letter@gmail.com>`**

The application sends from this address only when Render is configured to authenticate with the same Gmail account (or with a Gmail-verified alias). It does not send mail during deployment, building, or testing.

| Behaviour | Previous system | Repaired system |
|---|---|---|
| **Send Reminders Now** | Waited one second and displayed a simulated success message. | Calls the protected server process and displays real eligible, sent, skipped, and failed counts. |
| **Test email** | Not available. | Sends one deliberate test message only to `direct.letter@gmail.com`. |
| **Sender identity** | Could fall back to an unrelated `noreply@facingface.com` address. | Uses `SMTP_FROM`, or derives `FacingFace <SMTP_USER>`. |
| **Inactivity rule** | Used account age, not real activity. | Uses the existing authenticated `lastSeenAt` timestamp. |
| **Duplicate rule** | Could block a user permanently after any previous reminder. | Blocks a repeat only for the intended 30-day window. |
| **Delivery record** | Could be ambiguous. | Records a reminder only after SMTP accepts the recipient. |

## Step 1 — Prepare the Gmail sender account

For `direct.letter@gmail.com`, enable **2-Step Verification** in the Google Account and create a dedicated App Password named, for example, `FacingFace Render`. Google describes an App Password as a 16-digit passcode and requires 2-Step Verification to create one.[1]

> Do **not** put the normal Gmail password in Render. Store the generated App Password only in Render’s secret environment-variable field. Do not place it in GitHub, a ZIP file, source code, screenshots, or chat.

## Step 2 — Add or update the Render environment variables

Open **Render Dashboard → facingface-2 → Environment → Edit**. Keep all existing variables, then add or update the following rows one at a time.

| Key | Exact value | Secret? |
|---|---|---|
| `SMTP_HOST` | `smtp.gmail.com` | No |
| `SMTP_PORT` | `587` | No |
| `SMTP_SECURE` | `false` | No |
| `SMTP_USER` | `direct.letter@gmail.com` | No |
| `SMTP_PASS` | The new Gmail App Password, without spaces | **Yes** |
| `SMTP_FROM` | `"FacingFace" <direct.letter@gmail.com>` | No |
| `SMTP_TEST_RECIPIENT` | `direct.letter@gmail.com` | No |
| `PUBLIC_APP_URL` | `https://www.facingface.com` | No |

Gmail documents `smtp.gmail.com` as its outgoing SMTP server and supports port `587` for TLS/STARTTLS, which matches `SMTP_SECURE=false` in this Node mail configuration.[2]

Save the changes and wait for the service to redeploy successfully. A deployment by itself sends no email.

## Step 3 — Deploy this cumulative archive

Extract the ZIP and replace the **contents** of the existing GitHub repository with the extracted files. Do not create a second nested project folder. Commit and push to the branch linked to the current Render service. Wait for the service status to become **Live**.

The archive retains the previous Render disk, media, Profile, Page, Group, moderation, and log-cleanup repairs. It does not delete users, posts, Pages, Public Groups, images, or database records.

## Step 4 — Perform a safe delivery test

After the service is Live:

1. Sign in as the super administrator.
2. Open **Admin → Email Reminders**.
3. Confirm that **SMTP status** says `Configured and ready for a test` and **Sender** says `FacingFace <direct.letter@gmail.com>`.
4. Select **Send Test to Owner Inbox**.
5. Check the Inbox, Spam, and Sent folders of `direct.letter@gmail.com`.

A successful page message means Gmail’s SMTP server accepted the message. Delivery to a particular Inbox folder can still be affected by Gmail filtering, so check Spam as well. The test button is intentionally separate from real inactive-user reminders: it does not require your actively used administrator account to be inactive.

## How real reminders work

The **Send Eligible Reminders Now** button sends only to users who meet every condition below.

| Condition | Purpose |
|---|---|
| `lastSeenAt` is more than 14 days ago | Ensures the user is genuinely inactive. |
| The account has an email address | Prevents unaddressable send attempts. |
| The user is not the super administrator | Protects the owner account from automated re-engagement mail. |
| No reminder was accepted in the last 30 days | Prevents repeat email during the cooldown window. |

Your own owner account is active and is a super administrator, so it should **not** receive a real inactivity reminder. Use the test button to confirm sender delivery instead.

The activity counters in the page are now real:

| Counter | Meaning |
|---|---|
| **Inactive users identified** | All non-owner users whose last site activity was over 14 days ago. |
| **Eligible now** | Inactive users with an email and no accepted reminder in the last 30 days. |
| **Reminders sent in last 30 days** | Accepted reminders recorded after SMTP acceptance. |

## Choose how reminders run

The manual control is enabled immediately by this repair. A daily automatic schedule is optional because a separate scheduled service has a minimum monthly charge on Render.[3]

| Approach | Tradeoffs | Cost | Setup complexity |
|---|---|---:|---|
| **Manual from Admin → Email Reminders** | You decide when to send; best while validating the feature and managing a small community. | No additional scheduled-service charge. | Low. |
| **Daily 09:00 UTC Render scheduled run** | Fully automatic; requires a separate scheduled service with the same database and SMTP variables. | Render documents a minimum monthly charge of $1 for each scheduled service.[3] | Moderate. |

### Optional: daily automatic schedule

Only set this up after the owner test email arrives successfully. In Render, create a **Cron Job** from the same GitHub repository with these values:

| Setting | Value |
|---|---|
| Name | `facingface-inactive-reminders` |
| Runtime | Node |
| Build command | `npm install --legacy-peer-deps && npm run build` |
| Start command | `node dist/runInactiveReminders.js` |
| Schedule | `0 9 * * *` |

Give the cron job the same `DATABASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_TEST_RECIPIENT`, `PUBLIC_APP_URL`, and `NODE_ENV=production` values as the web service. Render Cron Jobs run a command on a defined schedule and exit when it is complete; their Runs page shows each run’s logs.[3]

Do not attach the web service’s persistent media disk to this cron job. Reminder email only needs the database and SMTP settings, and Render documents that cron jobs cannot access persistent disks.[3]

## Troubleshooting

| What you see | Meaning and action |
|---|---|
| The panel says `Not configured` | One or more of `SMTP_HOST`, `SMTP_USER`, or `SMTP_PASS` is missing. Re-check the Render Environment rows. |
| The test reports authentication failure | Regenerate a Gmail App Password and replace only `SMTP_PASS`. Confirm 2-Step Verification remains enabled. |
| The test reports success but no email appears | Check Spam and the Gmail Sent folder; then inspect the Render application log after the test time for the SMTP message ID or rejection. |
| No real reminders were sent | This is normal when `Eligible now` is zero. The system correctly does not email active users, the owner, accounts without an email, or users reminded in the last 30 days. |
| A run reports one or more failed deliveries | The page shows the first error. The affected user is not recorded as reminded, so the next manual or scheduled run can retry after the SMTP problem is corrected. |

## References

[1]: https://support.google.com/accounts/answer/185833?hl=en "Google Account Help — App Passwords"
[2]: https://developers.google.com/workspace/gmail/imap/imap-smtp "Google Developers — Gmail IMAP, POP, and SMTP"
[3]: https://render.com/docs/cronjobs "Render Docs — Cron Jobs"
