# FacingFace — Compact Admin User Actions

Release: **2 November 2026 — Admin Users action menu**

## What changed

In **Admin Panel → Users**, each row now has one compact **Actions ▾** dropdown instead of three always-visible Suspend, Make Admin and Delete buttons.

Open Actions for the account you want to review. The menu shows the member's name and the actions already permitted for your administrator role:

- **Suspend** for an active account, or **Unsuspend** for a currently suspended account.
- **Make Admin** or **Demote**, when permitted by the existing super-admin role rules.
- **Delete**, separated at the bottom and marked as destructive, when permitted by the existing rules.

Opening or closing the menu does not modify an account. The menu supports keyboard controls, touch, clicking outside, and Escape. It opens in a portal so the table's scrolling area does not clip it.

## Existing safeguards retained

- Suspend still opens the existing duration/reason form. A reason is still required before submission.
- Make Admin and Demote still use the existing confirmation prompts.
- Delete still opens the existing warning dialog and requires the member's exact name before permanent deletion can be submitted.
- Cancel does not apply an action.
- Regular admins do not gain role-changing or Delete permissions.
- Existing super-admin protection/visibility rules remain unchanged.
- Actions are disabled while a user-management command is pending, to reduce repeated submissions.

This is a focused Users-table interface change. Other Admin tabs, backend permissions, API handlers, database records and site features are unchanged.

## Deploy the newest complete ZIP

Use **facingface.com-admin-user-actions-dropdown-02-Nov-2026.zip**. This is the complete cumulative FacingFace website source, including the Digital Member Card, attractive card backgrounds, repaired profile link and all earlier repairs.

1. Download and extract this newest ZIP.
2. Replace the existing GitHub repository contents with its extracted contents.
3. Commit/push to `main` and let the existing Render service deploy.
4. Wait for **Live**, refresh the browser, and open **Admin Panel → Users**.

No new Environment Variables, API keys or database migrations are needed. Keep the current Start Command, Render/database/media settings, Gmail/SMTP settings and Cloudflare TURN configuration unchanged.

## Safe first check

Open an account's **Actions ▾** menu and verify that the previous row buttons are now inside it. Press Escape or click outside to close it. This does not modify the account.

You can inspect the Suspend form or Delete warning and then press **Cancel**. Do not submit any real action unless you intend to apply it to that account.

## Validation performed

- Production build passed.
- 68 focused member-card/privacy/call/group/reaction regression tests passed.
- 61 existing super-admin and social safety tests passed. Expected media-fixture FFmpeg warnings did not fail these tests.
- Browser checks with sandbox-only fixture accounts passed for the compact row menu, opening without mutations, portal placement, keyboard opening/Escape/focus return, mobile positioning, Suspend reason requirement, Unsuspend, promotion/demotion confirmations, protected-role menu visibility, and typed-name Delete confirmation/Cancel.
- The previous card-to-profile repair was rechecked on desktop, mobile and a separate window and remains working.
- No new TypeScript diagnostics were introduced; the existing 30 unrelated whole-project diagnostics remain.
- Full ZIP integrity, SHA-256 and file-by-file preservation are verified before delivery.

Only `client/src/pages/Admin.tsx` changes among existing application files. No live user account was suspended, promoted, demoted or deleted during testing. Tests did not access the production database.
