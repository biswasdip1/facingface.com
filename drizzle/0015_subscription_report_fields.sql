-- REVIEW ONLY: not executed by the November 2026 source-fix task.
-- PostgreSQL additive migration; do not use the legacy MySQL migration folder.
-- Review the actual deployment schema and take a backup before applying manually.
-- Nullable additions do not infer paid tiers, grant badges, or change existing users.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'subscriptions_tier_enum' AND n.nspname = 'public') THEN
    CREATE TYPE public.subscriptions_tier_enum AS ENUM ('green', 'golden', 'diamond');
  END IF;
END $$;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS "tier" public.subscriptions_tier_enum,
  ADD COLUMN IF NOT EXISTS "expiresAt" timestamp;

ALTER TABLE public.content_reports
  ADD COLUMN IF NOT EXISTS "description" text;
