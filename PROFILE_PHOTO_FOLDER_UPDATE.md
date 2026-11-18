# Profile-photo folder update — 18 November 2026

## What this package changes

This complete website source package starts from your exact uploaded `facingface.com-main-GitHub-18-Nov-2026.zip`. It is not based on an older November package. Every original file is retained; no uploaded user media, database backups, dependency folders or secrets are added.

The latest cumulative ZIP also hides the Explore FacingFace Home-menu card below 1024 CSS pixels while retaining the desktop sidebar. Read `DEPLOY_THIS_VERSION.md` first for that additional client-CSS change. The storage details and safeguards below are unchanged; you only need to deploy this one complete package.

Both individual-user upload routes now use the existing dedicated prefix:

```text
profile-photos/<authenticated-user-ID>/<timestamp>_<random-suffix>.jpg
```

The normal profile picker, crop-save and profile-photo history already used `profile-photos/`. The alternate `auth.uploadAvatar` route previously used `avatars/`; new uploads through that route now use `profile-photos/` too. Client-supplied filenames and IDs do not choose the owner's folder. Group logos remain under `group-avatars/`; covers, posts, messages, ads and other media keep their original locations and behavior.

The new profile-history row now records the actual key returned by storage, including the random suffix, rather than the requested pre-suffix key. Only new rows use this correction. Existing database rows are not rewritten.

For example, if your existing settings are:

```text
MEDIA_STORAGE_DRIVER=disk
MEDIA_STORAGE_PATH=/var/data/media
MEDIA_PUBLIC_PATH=/media
```

new individual profile images will be written beneath:

```text
/var/data/media/profile-photos/<user-ID>/
```

and served through `/media/profile-photos/<user-ID>/<filename>`. Disk storage automatically creates the directory when the first successful upload needs it. Do not change `MEDIA_STORAGE_PATH` to the profile subfolder: it is still the root for all media.

If the existing service uses S3-compatible storage instead, the same prefix is used inside its existing bucket. The update does not switch providers, public URL bases, buckets or keys.

## What happens to existing profile photos?

Existing URLs, files and history records stay where they are. The update does not move, rename, overwrite or delete old photos, including those under `avatars/`, older personal-media paths, the existing `profile-photos/` prefix or external/legacy hosts. Existing history selection continues using its recorded URL. Previously inaccessible or missing photo bytes cannot be recovered by this code change.

Both old `avatars/<user-ID>/` and new `profile-photos/<user-ID>/` remain covered by the existing user-confirmed self-account deletion/purge process. Its existing shared-asset and other-user isolation is unchanged. Single history-photo deletion and administrator account-deletion behavior are not redesigned by this patch.

## Deploy safely to your existing Render service

1. Keep a recent database export and media backup. Your downloaded `facingface-2-media.tar.gz` covers that service's `/var/data/media` folder at the time it was archived; confirm that it is also the media location used by the main website. Do not assume a chat-service backup covers another service or external storage.
2. Extract this complete ZIP into the root of the same GitHub repository that deploys the website. Do not upload the media backup, database export or private environment values to public GitHub.
3. Keep the existing Render service, database, persistent disk and environment settings. In particular, do not replace or rotate `DATABASE_URL`, `JWT_SECRET`, `CHAT_ENCRYPTION_KEY`, media-storage, email, Stripe, TURN or push settings.
4. Use the existing build command `npm ci && npm run build` and start command `node dist/_core/index.js`. There is no new database migration, new storage provider or new environment variable for this change. Keep existing startup/migration settings unchanged.
5. Deploy the updated source through your existing repository. This ZIP itself does not change production. A disk-backed Render deployment can briefly interrupt service; do not recreate the service or detach its disk to deploy this update.
6. Check sign-in and a pre-existing profile photo. With a disposable test account, upload a new profile photo through the normal picker and verify crop-save, refresh and history selection. Confirm that cover photos, posts and other users' images still display. Where you test the alternate avatar API, its existing input and response contract is retained.
7. Check the new upload's returned image URL or browser Network entry: it should contain `/profile-photos/<the-test-user-ID>/` under your configured public base. On disk, check the corresponding subfolder in the correct service's Shell. Never delete your owner account or production files merely to test this change.

No Android/iOS app source, version, signing key, IPA or AAB is changed. Your existing remote-backed apps can load this website update after deployment; verify the installed apps afterward rather than treating the local checks as device certification.

## Backup implications

A dedicated folder makes profile images easier to identify and back up selectively. It is still on the same configured disk/bucket; a folder is not an independent disaster-recovery copy.

Continue taking the full database and full-media backups. If you additionally make a profile-only backup, include the relevant user/avatar and profile-history database records. Until a separately planned and tested migration moves older files, do not back up only `profile-photos/` and assume every current profile photo is included: old active images may still be in `avatars/`, general-media paths or an external host. The safest current recovery set is the complete database plus all media locations, source code and privately preserved configuration.

Keep a second encrypted/private copy away from the hosting service and test restoration before a future hosting move. This patch does not configure recurring backups, relocate existing photos or recover previously missing files.

## Validation and exact scope

- TypeScript (`npm run check`): passed.
- Complete production website/server build (`npm run build`): passed. Existing large-chunk/dynamic-import warnings are not introduced as blockers by this change.
- Full included regression suite: 351 tests passed; 11 opt-in PostgreSQL tests skipped. No live database was used.
- Focused route/storage suite: 30 tests passed, including both upload endpoints, authentication and legacy avatar size-limit retention, actual returned storage keys, write-failure ordering, old URL reads, unchanged cover/group namespaces, real temporary-disk writes and mocked S3 operations.
- Disk/S3 self-account purge tests explicitly cover old and new profile prefixes, peer/shared assets, an owned symlink and paginated S3 listings with out-of-scope returned keys.
- No live Render command, user upload, real deletion, production storage operation or store submission was performed. Crop UI/image processing and database helper implementations are unchanged; this is not a new physical-device, restore or full security certification.

For the profile-storage portion, the only existing executable source changed is `server/routers.ts` at the two individual profile upload handlers. The combined package additionally changes `client/src/components/home-menu.css` to hide the mobile Home-menu card, and updates its existing regression expectation in `server/nov10-homeMenu.test.ts`. The existing storage implementation, ownership/purge logic, database/schema, remaining client files, subscription code, dependency versions, lockfile and Render configuration are retained unchanged. Two focused profile regression-test files and this guide are added; the main deployment guide points to the latest combined instructions.
