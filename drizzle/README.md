# FacingFace PostgreSQL schema and migrations

The active application uses PostgreSQL (`drizzle/schema.ts`, `drizzle.config.ts`). The `mysql_backup/` and nested legacy `migrations/` folders are historical; do not apply them to the deployed PostgreSQL database. Existing migration journals are incomplete and the old full chain contains duplicate enum history. Do not blindly replay the full chain, run schema push with force, or reset an existing database.

## November 2026 upgrade — manual operator review required

No deployed migration was run by the source-fix task. Before deploying this version, back up the actual PostgreSQL database and media, inspect the deployed schema against `schema.ts`, and test the upgrade in a restored staging database. Then apply only these additive scripts in order, using a trusted database connection selected by the operator:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/0015_subscription_report_fields.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/0016_account_deletion.sql
```

`0015` adds nullable subscription `tier`/`expiresAt` and stored report `description`. Existing paid tiers are not inferred or upgraded. `0016` adds `users.deletedAt`, the hashed deleted-login-identity registry, and durable media purge jobs. Both scripts use existence guards and contain no user deletion or cascading cleanup. Existing columns/types with incompatible definitions still require manual investigation; existence guards do not fix incompatible schemas.

Keep `RUN_DATABASE_MIGRATIONS_ON_STARTUP` unset/false in production. These manually reviewed scripts were intentionally not appended to the archive's incomplete global journal. Rollback to old application code does not require dropping the additive fields. Do not remove tombstones/identity hashes, as they prevent stale JWT/OAuth resurrection.

## Account deletion operations

`auth.deleteAccount` is bound to the signed-in user, requires exact typed confirmation and password or verified-email confirmation, and additionally checks enabled 2FA. It uses transactional personal-field/content redaction and a non-login tombstone, not cascading deletion of shared containers. Other members' content remains unchanged. Unresolved paid subscriptions and owned Pages/Groups pause deletion; support must assist with ownership transfer where no user-facing transfer flow exists.

After commit the cookie is cleared and owner-scoped media purge is attempted. A process-owned worker retries pending `account_media_purge_jobs` on startup and once per minute while the website is running. It purges reviewed personal upload namespaces only, never shared Page/Group media or arbitrary external URLs. Disk purges do not follow symlinks; S3 requires ListObjectsV2 and DeleteObject permissions. Unsupported/missing storage keeps the job pending with an error log rather than claiming physical deletion. Monitor pending jobs and investigate repeated failures:

```sql
SELECT "userId", "createdAt" FROM account_media_purge_jobs
WHERE "completedAt" IS NULL ORDER BY "createdAt";
```

Disk/legacy proxy URLs from deleted owners return 410 during pending cleanup. S3/public-CDN copies can remain accessible until successful purge and cache expiry; backup/payment-provider/legal records follow separately disclosed retention rules. Unknown legacy externally stored objects require operator assistance and are not blindly deleted.

## Fresh database and tests

Generate an initial schema from `schema.ts` into a separate empty output directory, review the generated CREATE/additive-constraint statements, and apply only to an explicitly authorized empty PostgreSQL database. Never use the local test schema as an upgrade script for an existing deployment.

The saved `server/nov2026-accountDeletion.integration.test.ts` is skipped unless explicitly opted in and the URL exactly matches the isolated local test database documented in that test. It seeds synthetic data and exercises redaction, peer preservation, repeat rejection, billing/ownership preconditions, and PostgreSQL transaction rollback. No real accounts or deployment data were used.
