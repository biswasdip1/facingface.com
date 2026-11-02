# FacingFace Member Card Background Refresh

Release: **2 November 2026 — background refresh**

## What changed

The optional Digital Member Card now has a more attractive background in both existing appearance choices:

- **Classic:** richer red-to-ruby header, soft rose waves, subtle decorative rings and a gently shaded footer.
- **Dark:** black-and-ruby background, burgundy waves and restrained rose highlights.

The name and member number remain readable. The QR remains black on a plain white panel, with its scanning margin unchanged. The design adapts to desktop and mobile and is included in new PNG downloads.

The design uses native CSS. No additional background-image files, external image service, API keys, dependencies or uploaded member-card images are required.

## What did not change

Only the card styling changed. All existing optional-member-card functionality is retained: private defaults, selected name/photo options, saving, sharing, downloads, replacing QR links, disabling sharing, sign-in and deliberate friend requests.

Existing member numbers, sharing links and saved card preferences are not changed by this release. Backend logic, database schema, Messenger, calls, Groups, Pages, posts and other existing website features remain unchanged from the previous complete Digital Member Card ZIP.

## Deploy the newest complete ZIP

Use **facingface.com-attractive-member-card-backgrounds-02-Nov-2026.zip**. This is a complete cumulative website source ZIP, not a CSS-only patch. It includes the previous Digital Member Card feature and all earlier repairs.

1. Download and extract the new ZIP.
2. Replace the contents of the existing FacingFace GitHub repository with its extracted contents.
3. Commit/push to `main` and allow the existing Render service to deploy.
4. Wait for **Live**, then refresh FacingFace and open **My Member Card**.

Do not change your Render Start Command, database, persistent media storage, Gmail settings or Cloudflare TURN settings. No new Environment Variables are needed. Do not enable global migrations for this visual update.

You can switch between Classic and Dark in the existing card settings. Already downloaded PNG images will keep their old appearance; download your card again to get the new background. A browser refresh may be needed to load the latest styling.

## Checks performed

- Production build passed.
- 68 focused privacy, member-card, call/TURN, reaction and Public Group tests passed.
- Production UI browser tests with isolated API fixtures passed for private defaults, saving, sharing controls, Classic/Dark selection, mobile layout, disabled/replaced links, visitor sign-in and deliberate connection actions.
- Classic and Dark PNG downloads were tested.
- An independent QR reader decoded both new PNGs to the intended member-card URL.
- File-by-file comparison with the previous complete Digital Member Card archive is performed before delivery: no previous files are removed, and only `client/src/components/digital-member-card.css` changes among existing files.
- ZIP integrity and SHA-256 are verified before delivery.

These tests did not access or modify the live FacingFace production database. After deployment, open your card, download it again and scan it with another phone to confirm your own live link.
