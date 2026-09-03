# FacingFace Render Stability Repair

## Purpose

This archive is a **cumulative repair** based on the supplied 03-Sep-2026 FacingFace source. It retains the Render persistent-media fix and adds targeted corrections for the confusing profile cover-photo flow, recurring Render error logs, Page posting isolation, and Public Group media reliability.

> Do not delete the web service, the Render PostgreSQL database, users, posts, Pages, or Public Groups. This release changes the application behaviour for new activity; it does not remove existing records.

## What this release fixes

| Area | Previous behaviour | Corrected behaviour |
|---|---|---|
| Profile cover photo | Clicking **Change Cover** also bubbled to the cover image and opened a full-screen viewer beneath the crop editor. Cancelling the crop editor then exposed the confusing viewer. | **Change Cover** opens only the normal crop editor. Cancel, close, or save returns directly to the profile. |
| Render media | A production Render service tried to use the unavailable Forge storage proxy, causing broken images and repeated `401` storage errors. | New media is written to the Render disk at `/var/data/media` and served from `/media/...`. |
| Visual moderation logs | Each image upload attempted an unavailable external provider and emitted repeated `401 Unauthorized` stack traces. | External moderation is **off by default** unless explicitly configured with a valid provider. Uploads no longer call the invalid provider. |
| Authentication logs | Normal anonymous visits logged `Missing session cookie`. | Anonymous visits to public pages are treated as normal and no longer logged as warnings. |
| Logout warning | Express logged a cookie deprecation warning on logout. | Logout uses the supported cookie-clearing behaviour. |
| Startup migration error | The existing database attempted an already-applied enum migration at each restart. | Production startup migrations are skipped by default. A one-time migration can be deliberately enabled only after a database backup. |
| Pages | New Page posts could be written into the ordinary personal Feed, and preview data overwrote the Page marker. | New Page posts are marked for their Page and excluded from the personal Feed. |
| Public Groups | Cover uploading could show completion before the request actually finished; Group posts created URL preview cards. | Cover uploads wait for the server response and can retry the same file. New Group posts do not fetch or show link-preview cards. |

## Safe deployment procedure

### 1. Create a database recovery point

Before changing code, make a manual Render PostgreSQL backup or confirm that the automatic backup retention covers the current time. Do not run database migrations during this release. Render documents its PostgreSQL backup and point-in-time recovery process at the reference below.[2]

### 2. Keep the existing persistent disk

Your Render disk has already been attached at the required path. Confirm the following in **Render Dashboard → facingface-2 → Disk**.

| Setting | Required value |
|---|---|
| Mount path | `/var/data` |
| Size | `10 GB` or larger |
| Service instances | One instance; a disk-attached service cannot scale to multiple instances. |

Only files written below the mounted path survive restarts and deploys, which is why user uploads are stored under `/var/data/media`.[1]

### 3. Replace the GitHub source with this archive

Extract this ZIP locally. Copy the **contents** of the extracted folder into the root of your FacingFace GitHub repository, replacing matching files. Do not create a second nested `facingface.com-main` directory in the repository. Commit and push the change to the `main` branch.

The archive does not include `node_modules`, `dist`, local test output, or any secret values.

### 4. Add the production environment variables

In **Render Dashboard → facingface-2 → Environment → Edit**, retain your existing variables and add or update only the following entries. Add each entry as a separate Key/Value row.

| Key | Value | Purpose |
|---|---|---|
| `MEDIA_STORAGE_DRIVER` | `disk` | Selects the attached Render disk for uploads. |
| `MEDIA_STORAGE_PATH` | `/var/data/media` | Places all new media beneath the persistent mount. |
| `MEDIA_PUBLIC_PATH` | `/media` | Creates public browser paths such as `/media/profile-covers/...`. |
| `CONTENT_MODERATION_ENABLED` | `false` | Stops calls to the unavailable provider that caused the moderation `401` errors. |
| `RUN_DATABASE_MIGRATIONS_ON_STARTUP` | `false` | Prevents the known duplicate-enum migration error from reappearing at each restart. |

Do not change `DATABASE_URL`, `JWT_SECRET`, email settings, Stripe credentials, or existing OAuth settings while applying this release. The old `BUILT_IN_FORGE_*` values do not need to be removed; the repaired production media code does not fall back to Forge for new uploads.

### 5. Deploy and wait for the service to become Live

Push the source change and let Render deploy it. Use **Manual Deploy** only if automatic deployment is disabled. Wait for a green **Live** status before testing. A disk-attached service does not support zero-downtime deployment; a brief restart while the new version starts is expected.[1]

## Acceptance checklist

Test with a normal user account and an administrator account after deployment.

| Test | Expected result |
|---|---|
| Profile photo | Upload, save, and hard-refresh. The new avatar remains visible. |
| Profile cover | Click **Change Cover**. The crop dialog opens without an underlying full-screen viewer. Cancel returns to the profile; saving returns to the profile with the new cover. |
| Personal photo post | Upload a small JPG/PNG, publish, and hard-refresh the home page. The image URL starts with `/media/` or `https://www.facingface.com/media/`. |
| Page cover/logo | As a Page administrator, upload a small image. The control stays on **Uploading…** until a success/failure response is received. |
| Page post | Publish a Page post, then view the Page and the personal Feed. The post appears on its Page and not in the personal Feed. |
| Public Group cover | As a Group administrator, upload a small cover image. It saves reliably and retrying the same file after a failed attempt is possible. |
| Public Group post | Publish a Group post. It appears in that Group only and does not create a URL preview card. |
| Logs | New logs must not contain `StorageProxy forge error: 401`, `Error checking visual media: 401`, `Missing session cookie`, or the `res.clearCookie` deprecation warning. |

## Understanding old broken images and old log lines

Old Render log lines cannot be erased by source code. Render keeps historical log entries for its retention period. This release prevents **new** instances of the identified errors; filter logs to the time after the successful deployment to assess the repaired release.

An image whose only copy was in the old Forge storage service cannot be recreated from its broken URL. Existing posts, account records, Page records, and Group records are deliberately preserved. Restore a historic image only by copying its original file from a backup/export or asking the uploader to upload it again. If the original file is copied back under the same media key, the compatibility route can redirect an old `/manus-storage/...` URL to `/media/...`.

Existing historic Page posts that were created before this release may not have a reliable Page marker. This archive does not make risky database guesses or move old posts automatically. New Page posts are correctly isolated. Historic Page posts should be reviewed individually before any optional later data-repair script is considered.

## Optional future moderation setup

Leave `CONTENT_MODERATION_ENABLED=false` until you have chosen, configured, and tested a valid moderation provider. Turning the setting to `true` without a valid provider does not block uploads, but emits one concise provider-warning after the first failed check. It should not be used as a substitute for provider configuration.

## Validation completed before packaging

The corrected archive was built successfully with `pnpm run build`. The focused storage and moderation suite passed **9/9 tests**, covering disk writes, public `/media` URLs, legacy URL conversion, traversal protection, the default disabled moderation mode, enabled provider results, and provider failure handling.

The pre-existing full project suite completed **207 tests successfully**. Nine unrelated suites require `STRIPE_SECRET_KEY` at test import time and cannot run without a valid test Stripe key. The pre-existing TypeScript check still reports unrelated diagnostics in Feed, InviteModal usage, Search, Subscription, and Stripe schema/version files; the production build is successful.

## References

[1]: https://render.com/docs/disks "Render Persistent Disks"
[2]: https://render.com/docs/postgresql-backups "Render PostgreSQL Backups"
