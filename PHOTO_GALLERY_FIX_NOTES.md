# FacingFace Photo Gallery Fix

This package includes a correction for the profile **Photos** tab.

The issue was traced to the post-photo gallery retrieval logic after the MySQL to PostgreSQL migration. The gallery query still used legacy snake_case SQL references inside comment and like count subqueries, while the PostgreSQL/Drizzle schema uses quoted camelCase columns. This could make the Photos gallery API fail or return no visible gallery items even though image posts were saved and visible in the Posts feed.

The fix updates `server/db.ts` so `getPostPhotos()` uses Drizzle schema references for PostgreSQL-safe column names, includes posts where any photo URL exists, and returns every uploaded photo URL from multi-photo posts. The profile Photos tab in `client/src/pages/Profile.tsx` was also adjusted so opened gallery photos link back to the original post ID after the photo rows are flattened.

Verification completed:

- `pnpm check` passed.
- `pnpm build` passed.

The production build output is included in `dist/`.

## Additional PostgreSQL repair: Pages and Public Groups

A second migration-related issue was found in Page and Public Group creation. The application was already configured for PostgreSQL, but a database migrated from the older MySQL schema can be missing newer quoted camelCase PostgreSQL columns selected by Drizzle, including moderation fields such as `isSuspended`, `suspendedAt`, `suspendedByAdminId`, and `suspendReason`.

This delivery adds an idempotent PostgreSQL migration at `drizzle/0006_postgresql_pages_groups_repair.sql` and registers it in `drizzle/meta/_journal.json`. The migration safely creates or repairs the `org_pages`, `page_followers`, `page_admins`, `public_groups`, `public_group_members`, and `public_group_posts` structures so Page and Public Group creation can work on a PostgreSQL database that was migrated from MySQL.

The server code was also adjusted so raw counter updates use Drizzle column references instead of unquoted camelCase identifiers. This prevents PostgreSQL from interpreting names like `followerCount`, `memberCount`, and `viewerCount` as lowercase identifiers.

## Profile layout adjustment

The profile header action area was rearranged to match the provided mobile screenshot. For other users' profiles, the action row now presents **Follow**, **Add Friend/Friend/Pending**, **Message**, and a compact menu button in a single row where possible. The block/unblock action was moved into the menu dropdown, friend removal now uses an inline confirmation prompt, and the profile counters were restyled into smaller bordered statistic boxes for a cleaner Instagram-like appearance.

## Desktop logo capitalization correction

The desktop navigation logo text was updated to match the mobile header branding. The previous desktop-only uppercase styling was removed so the logo now displays as **FacingFace.com**, with the `.com` portion in red, consistently across desktop and mobile views.

## Dedicated FacingFace Chat layout correction

The dedicated chat app layout was updated according to the provided screenshot. The header now keeps the red chat logo and **FacingFace Chat** title visible on desktop and mobile, links the logo area back to FacingFace.com, removes the **Dedicated Messenger · Active/Passive** subtitle line, removes the **Messenger style** label from the stories card, and hides the large search bar on mobile while keeping a compact top search icon that can open search when needed.

## Super Admin navigation indicator update

The desktop and dropdown navigation now distinguish `super_admin` users from regular `admin` users. Super admins see a **Super Admin** label that links to `/admin`, with a gold-accented shield style so the privileged mode is visibly different from the standard Admin item while keeping the same Admin Panel route and functionality.

## Buy & Sale listing creation media upload fix

The Buy & Sale create-listing flow was updated so uploaded listing media can be saved correctly on PostgreSQL-backed deployments. The server-side `shopListingInput` schema in `server/routers.ts` now accepts non-empty media path strings instead of requiring every entry to be a fully qualified absolute URL. This allows server-hosted relative media paths, such as `/manus-storage/...`, to pass validation and be stored in the `shop_listings.mediaUrls` JSON column.

The client-side submit handler in `client/src/pages/ShopCreateListing.tsx` now filters out any temporary browser `blob:` preview URLs before calling `shop.createListing`. Completed uploads still submit their returned server URLs, while unfinished temporary preview values are prevented from reaching the API.

Verification completed after this fix:

- `pnpm check` passed.
- `pnpm build` passed.

The updated production build output is included in `dist/`.

## Sales & Buy PostgreSQL shop table repair

A remaining Sales & Buy creation failure was traced to the database insert itself rather than the listing form. The failing query attempted to insert quoted PostgreSQL camelCase columns such as `"sellerId"`, `"mediaUrls"`, `"contactEmail"`, `"contactPhone"`, `"isFlagged"`, `"removedByAdminId"`, `"viewCount"`, `"createdAt"`, and `"updatedAt"`. On a database that was migrated from MySQL, these fields can be missing or imported as lowercase PostgreSQL identifiers such as `sellerid`, `mediaurls`, `contactemail`, and `viewcount`, which makes Drizzle's quoted insert fail.

This delivery adds `drizzle/0007_postgresql_shop_repair.sql` and registers it in `drizzle/meta/_journal.json`. The migration is idempotent and repairs the Sales & Buy schema by creating the shop listing enums if missing, ensuring `shop_listings` and `shop_saved` exist, renaming known lowercase migrated columns back to the quoted camelCase identifiers used by the Drizzle schema, and adding the missing moderation and counter columns required by the current insert path.

Verification completed after this repair:

- `pnpm check` passed.
- `pnpm build` passed.

The updated production build output is included in `dist/`.

## Blue Badge Stripe live-key configuration fix

The Blue Badge subscription page was failing when opening Stripe Checkout because the server-side Stripe request was using an invalid API key. The screenshot showed a key beginning with `sk_live_` but the value matched the public key pattern supplied for the site. Stripe Checkout session creation must be performed on the server with a real secret key from Stripe, not with the public `pk_live_` key and not with a manually edited key prefix.

This delivery updates `server/stripe.ts` to validate `STRIPE_SECRET_KEY` during server startup. The server now rejects empty keys, `pk_` publishable keys placed in the secret-key variable, and malformed keys that do not start with `sk_live_` or `sk_test_`. The subscription router in `server/routers.ts` now catches Stripe key/configuration failures and returns a clear deployment-focused message instead of exposing raw Stripe API-key details to the browser. The live subscription page copy in `client/src/pages/Subscription.tsx` was also updated to remove the test-card instruction from production-facing UI.

A new `.env.example` file documents the required deployment variables. For the current hosted Checkout flow, the critical production variable is `STRIPE_SECRET_KEY=sk_live_...` on the server. The supplied `pk_live_...` publishable key is not enough to create Checkout Sessions.

Verification completed after this repair:

- `pnpm check` passed.
- `pnpm build` passed.

The updated production build output is included in `dist/`.

## 2026-05-20 — FacingFace Chat Desktop and Mobile Layout Cleanup

The dedicated `chat.facingface.com` Messenger sidebar was tightened for both desktop and mobile according to the supplied direction screenshot. The visible **Stories** heading above the story avatars was removed, the story container was reduced in padding and height, and the compact story avatar sizing was reduced so the section occupies less vertical space on phones and desktop sidebars.

The always-visible desktop search row below the story box was removed. Search is now accessed from the header search icon on all screen sizes, matching the intended cleaner header-driven interaction while preserving the existing search filtering behavior. The Inbox and Groups tabs were moved closer to the story strip to reduce unused space and improve first-screen visibility of conversations.

Verification completed successfully with `pnpm check` and `pnpm build`. The production `dist/` output was regenerated after the chat UI changes.

## 2026-05-20 — FacingFace Chat Preferences Theme Selector Adjustment

The Chat Preferences modal was adjusted according to the supplied direction screenshot. The previous **Dark Mode** radio-style list with **Off**, **On**, and **Automatic** choices was removed from the modal and replaced with a compact **Theme** selector panel.

The new selector uses the existing global FacingFace theme modes: **W** for White, **LB** for Light Blue, **Be** for Beige, and **LD** for Light Dark. Selecting one of these buttons writes directly through the existing `ThemeModeContext`, so the chat appearance stays aligned with the site-wide theme system instead of maintaining a separate Messenger-only dark-mode preference.

Verification completed successfully with `pnpm check` and `pnpm build`. The production `dist/` output was regenerated after the Preferences modal change.

## 2026-05-20 — Sales & Buy photo upload preview and publish repair

The Sales & Buy create listing page was still failing after image upload because the manual upload request was reading the tRPC response as if it were a plain `{ url }` object. In production, the endpoint returns a standard tRPC/SuperJSON response envelope, so the client could accidentally store an invalid object-shaped value instead of the real `/manus-storage/...` media URL. That produced a broken image preview and also meant the **Publish Listing** payload did not contain clean PostgreSQL-safe media paths.

The create listing upload helper in `client/src/pages/ShopCreateListing.tsx` now unwraps all expected tRPC response shapes, including `result.data.json`, `result.data`, and direct fallback objects. It validates that the uploaded media URL is a real HTTP or root-relative server path, rejects `blob:` browser preview URLs before publish, and keeps the existing relative `/manus-storage/...` paths compatible with the PostgreSQL `shop_listings.mediaUrls` storage.

Verification completed successfully with `pnpm check` and `pnpm build`. The production `dist/` output was regenerated after this Sales & Buy repair.

## 2026-05-20 — Sales & Buy PostgreSQL publish insert repair

The live Sales & Buy **Publish Listing** failure was narrowed to a remaining PostgreSQL schema-repair risk after the MySQL migration. The photo upload path now succeeds, but the listing insert can still fail if the deployed PostgreSQL `shop_listings` table has not fully normalized from MySQL-style lowercase columns, missing shop columns, nullable required fields, or text/varchar versions of the enum-backed `condition` and `status` columns.

This delivery adds `drizzle/0008_postgresql_shop_listing_insert_repair.sql`, a second idempotent PostgreSQL repair migration that can safely run after `0007_postgresql_shop_repair.sql` or on a database where `0007` only partially addressed the live schema. The migration creates missing shop enum types, ensures `shop_listings` and `shop_saved` exist, renames or backfills lowercase migrated columns into the quoted camelCase identifiers expected by Drizzle, adds missing required insert columns such as `title`, `price`, `condition`, and `status`, normalizes defaults, casts `condition` and `status` to the PostgreSQL enum types, repairs `mediaUrls` as `json`, and explicitly sets the required `sellerId`, `title`, `price`, `currency`, `condition`, `category`, `status`, `isFlagged`, `viewCount`, `createdAt`, and `updatedAt` constraints.

The Sales & Buy insert helper in `server/db.ts` now logs structured PostgreSQL diagnostics if a listing insert still fails in production. The browser response remains unchanged, but the Render logs will now include the database error message, code, detail, hint, table, column, constraint, data type, and attempted insert field names. This should make any remaining live-only schema issue immediately visible without exposing raw database internals to users.

Verification completed successfully with `pnpm check` and `pnpm build`. The production `dist/` output was regenerated after this Sales & Buy PostgreSQL repair.

## 2026-05-20 — Sexual photo and video upload detection repair

A quick inspection confirmed that the existing moderation system was only checking **text content** before publishing. The main media upload route was validating size and duration, compressing photos, storing uploaded media, and generating video posters, but it was not checking the actual photo pixels or sampled video frames for explicit sexual/nudity content before storage. Direct Reel uploads also accepted video and thumbnail bytes without a visual moderation scan.

This update adds server-side visual moderation in `server/moderation.ts` through `moderateImageBuffer`, which sends uploaded image bytes or extracted video frames to the existing vision-capable LLM moderation path and returns the same `{ flagged, isSexual, reason }` result shape used by text moderation. The main media upload route now checks uploaded photos before compression/storage and checks sampled frames from uploaded videos before storage. Direct Reel uploads now check sampled video frames before saving the reel video and also check custom thumbnails before saving them.

Sexual visual violations now follow the same enforcement model as the existing sexual text moderation: the user violation count is incremented, the account is suspended for 24 hours on the first and second offences, and repeated third-or-later offences receive a 7-day suspension. Non-sexual visual violations are rejected with a moderation error instead of being stored.

Verification completed after this repair:

| Check | Result |
|---|---|
| `pnpm check` | Passed |
| `pnpm build` | Passed |

Deployment note: this change requires the production environment to keep the existing LLM API configuration available to the server, because image and video-frame moderation uses the same LLM helper already used for text moderation and image alt text generation.
