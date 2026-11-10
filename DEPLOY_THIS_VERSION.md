# FacingFace website — 4 November 2026 release

This is the corrected **browser website source**, based on your `facingface.com-clean-mobile-header-scroll-menus-03-Nov-2026.zip`. It is not an IPA or Android bundle. The new mobile builds follow this website stage. No production website, database or real account was changed while preparing this ZIP.

## What changed

Self-service account deletion is available at **Security → Delete my account**, with public instructions at `/delete-account`. It requires exact typed confirmation, current password or verified-email confirmation, and enabled two-factor authentication. Successful deletion removes credentials/private profile information, redacts authored content, clears browser identity/drafts and signs the user out. It preserves other members' content with minimal non-login tombstones and removes reviewed account-owned files through disk/S3 cleanup with durable retries.

The package also contains targeted user-profile privacy, bidirectional DM blocking/participant checks, decoded upload-size checks, passkey/RP and recovery-code repairs, safe optional Stripe startup and signed webhooks, frontend type/startup fixes, voice-recording cleanup and direct-call connection/audio recovery. November branding and website purchasing are retained. New native-free markers remove digital-plan checkout only inside the forthcoming explicitly marked free mobile build. Native draft/share handoff code has no effect on normal browser users.

The old built-in administrator password has been removed. Administrator seeding is off unless explicitly opted in with a unique secret. Existing administrator accounts/passwords are not overwritten. If an older default seed password was ever used, change that account password securely.

## Deploy to the existing Render service — order matters

1. **Back up PostgreSQL and the persistent media disk.** Preserve the existing `DATABASE_URL`, `JWT_SECRET`, `CHAT_ENCRYPTION_KEY` (if used), SMTP/payment/TURN/push settings and disk. Changing encryption/session secrets can make existing messages unreadable or invalidate sessions. Do not create an empty replacement database or detach `/var/data`.
2. Inspect the deployed PostgreSQL schema and test a restored staging copy. The two additive scripts below are necessary, but do not fix every possible difference in older optional tables.
3. Apply these scripts **before deploying the code**, using your own trusted database connection:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/0015_subscription_report_fields.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/0016_account_deletion.sql
```

`0015` adds nullable subscription tier/expiry and report description. `0016` adds the account tombstone timestamp, hashed-identity registry and media purge jobs. Neither script deletes user data or grants paid benefits. Review the scripts and backup first. Do not run a forced schema push, reset the database, replay old migration chains, or use MySQL migrations. Keep `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false`.

4. Extract this ZIP and place the application files in the root of the **existing deployment repository**. Use Node 22.12+; validation used Node 22.23.4. Preserve the required configuration in Render; `.env.example` is an empty reference, not production secrets.
5. Render build command: **`npm ci && npm run build`**. Start command: **`node dist/_core/index.js`**. Health check: **`/api/health`**. The `.npmrc` compatibility flag is intentional for the existing React/emoji-picker peer declarations.
6. After deployment, confirm `/api/health` returns HTTP 200 with `db: connected`; open `/delete-account`, log in, and verify that Security displays **Delete my account**. Test with a disposable new test account, not your owner account. Also verify login, posting/media, blocking/reporting and a two-person foreground call on real devices.

The current live website did not contain these deletion/native-free controls at the time of verification. Uploading this ZIP by itself does not update the live domain: Render must deploy the code and the required migrations must be applied.

## Deletion operations and retention

Paid recurring website subscriptions must be successfully cancelled first. Owners of Pages or Groups need ownership assistance before deletion so other members do not lose access; the website does not invent a transfer UI where none exists. Ordinary signed-in accounts do not need to email support to initiate deletion.

A minimal non-login ID and one-way former-login hash remain for relationship integrity and stale-credential protection. Other members' messages, shared containers, externally saved copies, CDN caches, backups and payment-provider records are not blanket erased. Reviewed personally owned media is purged after commit. The running website retries failed jobs at startup and every minute; S3 needs list/delete permissions. Monitor failures:

```sql
SELECT "userId", "createdAt" FROM account_media_purge_jobs
WHERE "completedAt" IS NULL ORDER BY "createdAt";
```

See `drizzle/README.md` for schema and retention details. Present-but-incompatible legacy tables cause transaction rollback rather than partial deletion and require operator remediation. Do not mark a purge complete unless the files were actually removed.

## Validation performed

| Check | Result |
|---|---|
| TypeScript and production website/server build | Passed on final source |
| Navigation/branding/post/call/media regressions | 271 tests passed |
| Safety/deletion/Stripe/storage/native-draft unit checks | 47 tests passed |
| Administrator seed safety | 2 tests passed |
| Real PostgreSQL redaction/peer preservation/billing/ownership/rollback | 4 tests passed using synthetic loopback-only data |
| Real compiled-site browser flow | Synthetic password login, confirmation gates, deletion, sign-out, own-file purge and peer preservation passed |
| Browser startup / denied storage / tablet layout / free-native route | Passed; layout simulation, not a physical-device certification |
| Production dependency audit | 0 high and 0 critical; 8 low/moderate advisories remain |

Test groups overlap on one shared regression; do not add them as a unique-test total. Development/test dependencies still have separate advisories. Do not expose Vite/Vitest development servers in production; production runs only the compiled Express server. No live SMTP/OAuth/2FA/passkey end-to-end or iPhone/iPad/Android store approval is implied.

## Next: iOS, then Android

Deploy and verify these website controls first so the native app can actually use them at `https://www.facingface.com`. The native app must use a new, simplified launch entry and real native draft/media/share tools, with the approved free-mobile edition. Preserve existing store identifiers/signing keys and use higher build numbers. Prepare new signed IPA/AAB only from this release work; do not reuse September binaries. Test on actual iPhone and iPad, including denied permissions and offline launch, before App Review. A successful cloud build is not a guarantee of Apple/Google approval.

This ZIP intentionally excludes installed dependencies, compiled output, credentials, logs, screenshots, old release notes, legacy MySQL/migration backups and disposable test-database files. It includes application source/assets, required build configuration, current schema, the two reviewed upgrade scripts and selected relevant regression tests.
