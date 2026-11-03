# FacingFace Optional Digital Member Card

Release: **2 November 2026**

## What is included

This complete cumulative ZIP adds an optional **Digital Member Card** to FacingFace. It is designed to promote member profiles through a QR code, a shareable link and a downloadable PNG card. It is a social profile card, **not official identification or proof of real-world identity**.

The new card follows the supplied red-and-white concept with a dark appearance option and uses the existing FacingFace FF logo. Desktop cards are horizontal; phone cards adapt to a vertical layout. It uses the current profile display name rather than inventing a username. It does not add country or other new personal-data fields.

The ZIP retains the existing September cumulative repairs, including the video-call self-view and expand controls, Messenger, Groups, Pages, profile/cover workflows, and vertical Shorts repairs.

## Where users find it

After deployment, sign in and open your profile. Click **My Member Card** beside **Edit Profile**. The same link appears in the account/settings menu.

Direct owner route:

```text
https://www.facingface.com/member-card
```

The owner screen requires sign-in. Users who do not want a member card can simply ignore it; no card is published automatically.

## How to use it

1. Open **My Member Card**. The first preview is private; sharing and the profile-photo option start off.
2. Decide whether to show your existing **profile display name** and **profile photo**. If the name is hidden, the card says “FacingFace member”. If the photo is off or unavailable, initials are shown.
3. Choose **Classic** or **Dark**.
4. Turn on **Enable public sharing**, then click **Save card settings**.
5. The saved card receives a random member number and a QR code.
6. Choose **Share card**, **Copy link**, or **Download PNG**. On supported phones, Share opens the phone's sharing menu; elsewhere it copies the link.
7. Use the link or downloaded card in messages, other social profiles, or at community events.

Sharing and downloading are disabled while edits are unsaved. If a browser cannot export an externally hosted photo, turn off the photo option, save, and try downloading again.

## Privacy and safety

- Public sharing is **off by default**, for existing and new users.
- No passport, driving licence, national ID, or biometric information is collected.
- The card never contains email, phone, birthday, address, private posts, or messages.
- It displays only the selected name/photo, random member number, branding and QR link.
- The number is separate from the existing database account number. Existing profile URL conventions are unchanged.
- QR generation and PNG download happen in the browser, without a third-party QR generation service.
- A QR opens the shared card only. It never creates a session, signs someone in, sends a friend request, or grants access to private content.
- Visitors must sign in to view the full existing profile or deliberately press **Connect** to send a standard friend request. The request is not automatically accepted.
- Signed-in blocks are checked in both directions for card viewing and connection requests. An anonymous public visitor cannot be matched to a blocked account; enabled cards must therefore be treated as public information.
- Cards for currently suspended or deleted accounts are unavailable.
- Public pages ask search engines not to index them and use no-store caching headers. This is not a guarantee that a public card cannot be copied.
- Viewing/changing/requesting connections is rate-limited. No CAPTCHA has been added.
- A card being available only confirms that its account/card is currently available; it does not prove the identity of someone holding a screenshot.

To stop sharing, turn off **Enable public sharing** and save. The previous QR/link stops working and is not revived by enabling sharing later. To replace a link while keeping the same member number, use **Replace QR / sharing link**, confirm, then download and share the updated card.

Previously downloaded images and screenshots cannot be recalled or erased from someone else's device. Their old QR can be made inactive. Already-open online card pages refresh periodically; backend access checks apply to every new request.

## Deployment: no new environment settings

1. Download the newest **complete ZIP** from this delivery.
2. Extract it.
3. Replace the contents of your existing FacingFace GitHub repository with the extracted contents. Do not create a new website or a new Render service.
4. Commit/push to `main` and allow Render to deploy.
5. Wait until Render shows the deployment as **Live**.

Keep the current Build Command and Start Command. The Start Command remains:

```text
node dist/_core/index.js
```

Do **not** change your Cloudflare TURN variables, Gmail/SMTP configuration, database connection, persistent disk/media settings, or `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false`. No new API key or Environment Variable is required.

For persistent cross-device card preferences, the feature creates **one separate small `digital_member_cards` table on first authenticated use** with `CREATE TABLE IF NOT EXISTS`. It does not replay global migrations, alter existing user/post tables, reset data, or generate cards for every user. The database account needs its existing table-creation permissions. If the feature cannot access its storage, it shows an error instead of pretending that settings were saved; other existing website features are unchanged.

Downloaded card PNGs are produced on demand on the member's device; they are not all uploaded or duplicated on your Render persistent disk.

## First deployment test

Use your own account first:

1. Confirm the card is initially private and has no public QR.
2. Enable sharing, save, then download the PNG.
3. Scan the PNG from another phone or open its copied link in a signed-out browser. You should see only the selected card details.
4. Verify that scanning alone does not send a friend request. Connect should require sign-in and an explicit click.
5. Change appearance and save. Refresh to confirm the settings persist.
6. Replace the QR and check that the previous link is unavailable.
7. Turn sharing off, save, and check that the current public link becomes unavailable.

If this first test is successful, invite a few members to try it before promoting the feature widely.

## Validation performed before delivery

- Complete production build passed.
- **68 focused tests passed**, including new privacy/ownership API tests and existing privacy, call/TURN, reaction, and Public Group regressions.
- **7 isolated PostgreSQL-engine integration tests passed** using PGlite, covering real SQL table creation, persistence, stable member numbers, QR replacement, disabling/re-enabling, and account isolation. These used a temporary test database, not the production database.
- Browser checks passed against the production UI with isolated API fixtures: owner route, private defaults, save controls, classic/dark appearances, mobile overflow, PNG download, public unavailable page, visitor sign-in, and explicit connection actions.
- The downloaded PNG QR was decoded by an independent QR reader and matched the intended card URL.
- The existing TypeScript diagnostic count remained unchanged at **30**, with no new diagnostics from this feature. The project's whole-repository type check therefore remains unsuccessful for those pre-existing unrelated issues.
- No baseline source files are missing. Render configuration, CallModal and Calls page code are byte-for-byte unchanged.
- Archive integrity, excluded-file checks and SHA-256 will be verified before delivery.

This has not been deployed to or tested against the live FacingFace production database. The deployment and first-use test above are still required.
