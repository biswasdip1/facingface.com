# FacingFace Render Media Fix

## What this update fixes

This archive changes FacingFace so **new media uploads do not use the Manus Forge `/manus-storage/...` route in production**. Instead, the Render service writes photos, avatars, covers, videos, audio, and documents to a persistent disk mounted at `/var/data/media` and serves them from the public site path `/media/...`.

The previous repeated Render log entry:

```text
[StorageProxy] forge error: 401 {"error":"invalid token"}
```

will stop after this version is deployed. In production, the legacy `/manus-storage/...` endpoint no longer calls Forge.

## Deploy this ZIP to the existing Render service

Before changing anything, create a database export from **Render Dashboard → your PostgreSQL database → Recovery → Create export**. This media fix does not modify your database, but the backup protects all users and posts.

| Step | What to do |
|---|---|
| 1 | Unzip this archive, replace the contents of the linked GitHub repository, commit, and push the change. Do not copy `node_modules` or `dist` to GitHub. |
| 2 | In **Render Dashboard → your FacingFace web service → Disks**, add a persistent disk. Set its mount path to `/var/data` and select at least **10 GB**. If a disk already exists, confirm it is mounted exactly at `/var/data`; do not delete it. |
| 3 | In **Render Dashboard → your FacingFace web service → Environment**, add or confirm the three values below. Save and deploy. |
| 4 | Redeploy the service after the GitHub update and disk/environment update are complete. |
| 5 | Sign in, upload one new test photo, publish it, then hard-refresh the page. Confirm the photo displays and its URL starts with `/media/`, not `/manus-storage/`. |
| 6 | Check Render logs. There must be no new `[StorageProxy] forge error: 401` messages. |

Use these exact environment values:

```text
MEDIA_STORAGE_DRIVER=disk
MEDIA_STORAGE_PATH=/var/data/media
MEDIA_PUBLIC_PATH=/media
```

> Keep `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` only if other existing features require Forge-based APIs, such as your current moderation, map, or AI features. This update ensures they are **not** used for production media storage.

## Existing broken images

This code repair makes future uploads work and stops the invalid-token errors. It cannot recreate an old image from a URL alone: the database retains only the old URL, not the original image bytes.

Existing `/manus-storage/<key>` links are now handled safely. If the original file is later copied into the Render disk using the **same key** beneath `/var/data/media`, the old link automatically redirects to `/media/<key>` and works again. For example:

```text
Old database URL: /manus-storage/posts/123/photo.webp
Render disk location: /var/data/media/posts/123/photo.webp
New public URL: /media/posts/123/photo.webp
```

Do not run a blanket SQL replacement of old URLs. It cannot restore files that were never copied to the new disk. Recover original files only from a legitimate export, an uploader’s device, a backup, or the prior storage provider; then restore them one by one or allow the owner to re-upload.

## Important Render limitation

Render persists only files under the attached disk mount. Its normal service filesystem is temporary, so do not alter `MEDIA_STORAGE_PATH` to a directory outside `/var/data`. A service with an attached disk runs as one instance and has a short restart during redeploy; this is normal for this low-cost Render-native media setup.

## Changed files

| File | Change |
|---|---|
| `server/storage.ts` | Adds the Render persistent-disk media driver, secure key validation, compatible direct S3 mode, and production Forge fallback protection. |
| `server/_core/storageProxy.ts` | Serves `/media/*` from the persistent disk; legacy Forge links redirect only when matching restored files exist. |
| `render.yaml` | Declares the `/var/data` persistent disk and three required media variables. |
| `DEPLOYMENT.md` and `docs/env-template.txt` | Corrected the storage environment-variable documentation. |
| `server/storage.test.ts` and `server/storageProxy.test.ts` | Adds automated checks for write, serving, path safety, and legacy redirects. |
