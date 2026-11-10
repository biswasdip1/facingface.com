-- REVIEW ONLY. Apply manually after 0015_subscription_report_fields.sql,
-- before deploying code. No deletion/cascade and no automatic runtime migration.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "deletedAt" timestamp;
CREATE TABLE IF NOT EXISTS public.deleted_account_identities (
  "identityHash" varchar(64) PRIMARY KEY,
  "deletedAt" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.account_media_purge_jobs (
  "userId" integer PRIMARY KEY,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "completedAt" timestamp
);
