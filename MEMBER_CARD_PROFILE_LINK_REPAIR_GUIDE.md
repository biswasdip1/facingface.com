# FacingFace Member Card — View Profile Link Repair

Release: **2 November 2026 — profile link repair**

## What was wrong

The shared Digital Member Card opened correctly, but pressing **View profile** changed the URL while the application remained in its card-only routing branch. That branch did not contain the profile page, so it showed the app's 404 screen.

This was reproduced in the unchanged previous production build before making the repair.

## What was repaired

The top-level router now listens to client-side route changes. Moving from a shared card to a profile selects the normal authenticated application layout and displays the existing profile screen.

No new profile page was created. Existing profile permissions and the signed-out sign-in requirement remain in place. Clicking View profile does not send a friend request.

The only changed existing application file is `client/src/App.tsx`. The Classic/Dark backgrounds, QR generation, saved member numbers and sharing links, privacy settings, backend code, database, Messenger/calls and existing features are unchanged.

## Deploy the newest complete ZIP

Use **facingface.com-member-card-profile-link-repair-02-Nov-2026.zip**. It is the complete cumulative FacingFace website source, including the attractive member-card backgrounds and all earlier repairs. Do not deploy multiple ZIPs together or create another website.

1. Download and extract this newest ZIP.
2. Replace the existing GitHub repository contents with the extracted contents.
3. Commit/push to `main` and let the existing Render service deploy.
4. Wait for **Live**, then refresh the browser.

Keep the existing Start Command:

```text
node dist/_core/index.js
```

Do not change the database, persistent media storage, Environment Variables, Gmail/SMTP settings, Cloudflare TURN configuration, or `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false`. No migration or new API key is required.

## Test after deployment

1. While signed in, open your existing shared member-card link.
2. Press **View profile**. Your existing profile should open instead of 404.
3. Press the browser's **Back** button. Your card should reappear.
4. On the card, press **My member card**. The owner settings screen should open.
5. Repeat with a friend's card and on a phone if possible.
6. In a signed-out/private browser, View profile should still ask for sign-in rather than expose the full profile.

You do not need to create a new card, replace the QR, or download the card again for this link repair. Existing shared links continue to work.

## Validation

- The original card-to-profile 404 was reproduced before the fix.
- Production build passed.
- 68 focused member-card, privacy, call/TURN, reaction and Public Group tests passed.
- Browser navigation checks passed for your own card, a friend's card, mobile, and a separate popup window. View profile, browser Back, and My member card worked without requiring a page reload.
- Signed-out View profile still required sign-in, and viewing did not send a friend request.
- The existing member-card browser checks also passed for private defaults, saving, appearance, PNG download, QR/link replacement, disabled links and deliberate Connect actions.
- No new TypeScript diagnostics were introduced. The existing 30 unrelated whole-project diagnostics remain.
- Complete ZIP integrity, SHA-256 and file-by-file preservation are checked before delivery.

Browser checks used the real production UI with sandbox-only API fixtures, not the live production database. The deployment test above is still required on FacingFace.
