-- Reviewed manual equivalent of the targeted 10 November startup compatibility step.
-- Back up first if applying directly. No deletion/cascade or global migration replay.
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
