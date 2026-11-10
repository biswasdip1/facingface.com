# FacingFace complete Home menu, login, header and native scroll update — 10 November 2026

This complete website package starts from your exact uploaded `FacingFace-Website-2026-11-04-Self-Delete-Deploy.zip`. Every original file is retained. The existing website, self-service account deletion, media/call repairs, November branding and normal-browser subscriptions are preserved. This is website source, not a new Android AAB or iOS IPA.

## Latest Home/feed menu update

This ZIP includes every preceding login/header/scroll repair plus a Home-only **Explore FacingFace** shortcut menu. Desktop uses balanced menu/feed/news columns; mobile/tablet starts with a compact collapsed Menu toggle. Profile viewers, Your Page, Public Group, Sale & Buy, More, Birthdays and Events retain their real destinations. Website-only verification purchase links remain excluded from free-native sessions. Menu colors use the existing theme variables. The organisation Page layout, shared header, posts, ads, account-deletion backend, subscriptions and database connection settings are unchanged from the preceding complete repair.

Deploy this newest complete ZIP instead of stacking partial packages or using an older ZIP. Follow the same existing-Render/repository instructions below. This Home-only change needs no database schema update or new IPA/AAB. After deployment, reload Home or close/reopen the existing app. Local synthetic-data checks passed at 375,390,640,768,1024,1280,1401,1434,1536,1920; the preceding responsive header and zero-blocking-native-touch-listener checks also still pass. TypeScript/production build passed and the included suite passed 330 tests, with 11 database opt-in tests skipped in this latest run. This is not a new physical-device performance certification.

**Location is not enabled by this update.** The inspected source has manually entered public profile city/location strings and recommendations by mutual friends, not GPS/proximity matching. `LOCATION_FEATURE_STATUS.md` explains the existing behavior and a separate opt-in city/area proposal. No user's location was requested or collected, and no tracking permission, location schema or store declaration changed. A location-discovery implementation requires explicit product/privacy decisions first.

## Header and TestFlight update — deploy this complete ZIP

The latest package also fixes the clipped menu label beside Saved. Primary header items stay whole; Scheduled/Trending and other routes that do not fit at narrower widths are available from the existing settings menu. Search stays available as an icon on smaller layouts. Account controls remain separate, and the menu includes a **Delete my account** shortcut to the existing protected confirmation screen. The shortcut does not itself delete an account.

In explicitly marked native app sessions, the feed no longer installs the custom page-wide, non-passive pull-to-refresh touch listener. Ordinary browser sessions retain their existing pull gesture. In the native app, use its **Home** button to reload the feed. Infinite-feed measurements are coalesced to animation frames and duplicate requests during one load are guarded. Loaded post images no longer retain a second full-resolution blurred placeholder; actual images decode asynchronously. Posts, ads, messaging, media URLs and purchase restrictions are not removed.

These are hosted website changes, compatible with the already uploaded remote-backed **TestFlight 1.0 build 5** and Android **10005**. No native source, signing key, app version or binary was changed. Deploy through the same existing Render repository using the instructions below. After Render reports the new commit live, completely close/reopen the TestFlight app, tap Home and compare scrolling through the same feed with Safari. Test centered vertical swipes at the top and middle of the feed; distinguish finger movement from post-release momentum. If a cache still shows old assets, use **Retry or tools → Open website** where available, or re-open the app; avoid deleting app data because local drafts may be lost.

The header geometry/whole-label checks passed in Chromium at widths 640, 768, 820, 1024, 1280, 1366, 1434, 1536 and 1920, including a synthetic super-admin account with extra controls. The simulated native session had **zero document-wide non-passive pull listeners**; browser mode retained one. These are source/layout/listener checks, not an actual iPhone performance measurement. The user's reported scrolling improvement must be verified on the same physical iPhone after deployment. If a remaining issue is native edge gestures, inertia or native bar layout, investigate that separately; those native changes would require a new IPA rather than another website-only promise.

## What caused the login failure

Your supplied Render logs show a successful build and a running service, followed by `Startup migrations skipped` and PostgreSQL error `42P01`: `account_media_purge_jobs` does not exist. Your screenshot also shows a login query requiring `users.deletedAt`. The previous package required the additive 0015/0016 SQL scripts to be applied manually before code deployment. Uploading the code without that upgrade left the new code and existing database out of sync. Duplicate-object NOTICE messages and large frontend-chunk warnings are not the cause of this login failure.

## What this repair changes

Before any login routes, seeds or account-purge worker start, `server/accountDeletionSchema.ts` checks and transactionally creates only the missing additive schema from the supplied 0015/0016 upgrade:

- Nullable `public.users.deletedAt`, with no default. Existing active accounts are not marked deleted.
- `public.deleted_account_identities` and `public.account_media_purge_jobs` if missing.
- Nullable subscription `tier`/`expiresAt` and report `description` if those existing optional tables need them.

A transaction-scoped lock serializes overlapping startups. Failed additions roll back. Existing incompatible deletion definitions cause a clear failure instead of destructive conversion or silently announcing success. Startup refuses to initialize an empty replacement database. The full legacy Drizzle migration history remains disabled.

No existing user/password/billing rows are rewritten by this schema repair. It does not cancel subscriptions, grant badges, reset sessions, re-encrypt messages, purge files, or remove tombstones/hashes/cleanup history. Existing account deletion and its paid-subscription preconditions are unchanged. Normal cleanup continues only for accounts actually deleted through the existing user-confirmed deletion process.

Render health now validates the required deletion fields, not only database connectivity. Production internal errors no longer expose raw SQL/query parameters to the login page; ordinary invalid-password feedback remains useful.

## Deploy to the existing Render service

1. **Back up the existing PostgreSQL database and persistent media disk first.** Review the new helper or test a restored staging copy. Do not reset or replace the database, detach `/var/data`, or recreate the service from a Blueprint.
2. Extract this complete ZIP into the root of the **same existing GitHub deployment repository**. Update its source files and commit/push using your normal process. Do not copy `node_modules` or old compiled `dist` output into the repository.
3. In the **existing Render service**, preserve `DATABASE_URL`, `JWT_SECRET`, `CHAT_ENCRYPTION_KEY` (if configured), SMTP, Stripe/webhook, TURN, push settings and disk. Do not generate new secrets, rotate passwords, cancel subscriptions, or overwrite live environment variables with `.env.example`.
4. Keep `NODE_ENV=production` and **`RUN_DATABASE_MIGRATIONS_ON_STARTUP=false`**. Do not enable the global migration flag to fix this error. This repair uses its fixed targeted compatibility step independently of that flag.
5. Build command: `npm ci && npm run build`. Start command: `node dist/_core/index.js`. Health check path: `/api/health`. The supplied npm lockfile and `.npmrc` are unchanged. Your logged Node 20.20.2 build succeeded; no Node-version change is necessary to solve this schema error. If your repository still contains an unrelated old `pnpm-lock.yaml`, use these npm commands so Render installs the lockfile shipped in this ZIP.
6. Deploy the latest commit. Startup automatically performs the targeted additive schema check. There is no need to separately execute 0015/0016 when this step succeeds. Expect the log line:

```text
[DB] Account deletion schema ready; existing accounts and subscription rows retained.
```

7. Open `https://www.facingface.com/api/health`. Expect HTTP 200 and `status: ok`, `db: connected`, `accountDeletionSchema: ready`. Then sign in with your existing account; verify your profile, posts, messages and existing subscription status. Do not delete the owner account as a test.
8. Open `https://www.facingface.com/delete-account` in a private/incognito window: it should display **Delete your FacingFace account**, not the sign-in fallback. Verify **Security → Delete my account** while signed in. Test actual deletion only with a disposable new test account whose loss is intentional, and check its own media is removed while another user's content remains.

If startup fails, read the first underlying PostgreSQL error in Render. Insufficient ALTER/CREATE permissions, missing base tables or incompatible existing definitions need operator investigation. A rejected deployment is not evidence the database was erased. Do not bypass the failure with forced schema push, a reset, or a full migration replay. Rolling back application code does not require dropping the additive fields; retain deletion tombstones, identity hashes and purge-job history.

## Account deletion and ongoing subscriptions

Website subscriptions remain available and unchanged for ordinary browser users. The approved free-native marker still removes digital checkout only in marked mobile-app sessions. This repair does not cancel or interrupt anyone's subscription.

Actual account deletion remains irreversible and user-confirmed. A recurring subscription must first be successfully cancelled by its owner. Page/Group owners must resolve ownership to preserve other members' access. Ordinary accounts can use the self-service deletion UI. A minimal non-login tombstone and one-way former-login hash preserve relationship integrity and block stale credentials. Reviewed personally owned media is purged after the transaction; failed cleanup is retried by the existing worker. Peer messages, externally saved copies, payment-provider/legal records and backups are not blanket erased. Consult the existing privacy/deletion pages and `drizzle/README.md` for retention and operations details.

## Validation for this repair

The repaired source passed TypeScript and the complete production frontend/server build with the original package/lockfile. The included non-production regression suite passed **321 tests**; opt-in SQL suites are skipped in the ordinary run. The new targeted schema suite separately passed **7 actual PostgreSQL tests** covering the reproduced missing-column error, nullable additions, account/billing preservation, exact tombstone/job preservation on repeat runs, missing optional tables, rollback on malformed definitions, refusal to initialize a wrong/empty database, incompatible marker types and concurrent startup serialization.

A real compiled-server test started against a synthetic legacy database with global migrations disabled. It verified automatic schema readiness, exact existing account/password/subscription preservation, public deletion instructions, successful password login, refusal to delete an actively subscribed account without cancelling it, disposable self-deletion and sign-out, personal-file purge and peer-file/content preservation, with no browser page errors.

These were isolated synthetic tests, not a change to your live Render database or a physical-device/store certification. Dependencies were intentionally not upgraded in this targeted repair; this package is not a blanket security certification. Existing legacy optional-table differences still need operator review if they produce their own errors.

## Google Play and mobile apps

No Android or iOS binary needs to be rebuilt merely for this website/database repair: the existing remote-backed mobile builds load the deployed website. After deployment, verify the installed Android app too. Do not submit an unverified Data safety encryption claim or the optional data-only deletion claim. Use the public `/delete-account` URL in Google Play only after the live page and request path actually work. This update does not publish the app or guarantee Apple/Google approval.
