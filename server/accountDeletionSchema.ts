import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/**
 * Only the additive schema from shipped migrations 0015/0016 is permitted here.
 * This never runs the global Drizzle migration journal, resets data, rewrites
 * users, grants paid tiers, cancels subscriptions, or purges files.
 */
export async function ensureAccountDeletionSchema<TSchema extends Record<string, unknown>>(db: PostgresJsDatabase<TSchema>): Promise<void> {
  await db.transaction(async tx => {
    // Bound lock waits and serialize competing Render process startups.
    await tx.execute(sql`SET LOCAL lock_timeout = '10s'`);
    await tx.execute(sql`SET LOCAL statement_timeout = '30s'`);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(20261110, 16)`);

    const existing = await tx.execute(sql`
      SELECT table_name AS "tableName", column_name AS "columnName", data_type AS "dataType",
        is_nullable AS "isNullable", column_default AS "columnDefault"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('users', 'deleted_account_identities', 'account_media_purge_jobs', 'subscriptions', 'content_reports')
    `) as unknown as Array<{ tableName: string; columnName: string; dataType: string; isNullable: string; columnDefault: string | null }>;
    const hasTable = (name: string) => existing.some(row => row.tableName === name);
    const hasColumn = (table: string, column: string) => existing.some(row => row.tableName === table && row.columnName === column);
    if (!hasTable("users")) {
      throw new Error("[Account deletion schema] Existing public.users table is missing. Verify DATABASE_URL; an empty replacement database will not be initialized.");
    }
    const deletedAt = existing.find(row => row.tableName === "users" && row.columnName === "deletedAt");
    if (deletedAt && !["timestamp without time zone", "timestamp with time zone"].includes(deletedAt.dataType)) {
      throw new Error("[Account deletion schema] Existing users.deletedAt has an incompatible type; automatic conversion is intentionally disabled.");
    }
    if (deletedAt && (deletedAt.isNullable !== "YES" || deletedAt.columnDefault !== null)) {
      throw new Error("[Account deletion schema] Existing users.deletedAt must be nullable without a default. No existing deletion markers will be reset automatically.");
    }
    if (!deletedAt) {
      await tx.execute(sql`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "deletedAt" timestamp`);
    }

    // IF NOT EXISTS avoids changing already-provisioned identity/job records.
    if (!hasTable("deleted_account_identities")) {
      await tx.execute(sql`CREATE TABLE IF NOT EXISTS public.deleted_account_identities (
        "identityHash" varchar(64) PRIMARY KEY,
        "deletedAt" timestamp DEFAULT now() NOT NULL
      )`);
    }
    if (!hasTable("account_media_purge_jobs")) {
      await tx.execute(sql`CREATE TABLE IF NOT EXISTS public.account_media_purge_jobs (
        "userId" integer PRIMARY KEY,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "completedAt" timestamp
      )`);
    }

    // A legacy optional table may be absent. Never invent billing/report rows.
    if (hasTable("subscriptions")) {
      if (!hasColumn("subscriptions", "tier")) {
        await tx.execute(sql`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                         WHERE t.typname = 'subscriptions_tier_enum' AND n.nspname = 'public') THEN
            CREATE TYPE public.subscriptions_tier_enum AS ENUM ('green', 'golden', 'diamond');
          END IF;
        END $$`);
        await tx.execute(sql`ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "tier" public.subscriptions_tier_enum`);
      }
      if (!hasColumn("subscriptions", "expiresAt")) {
        await tx.execute(sql`ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "expiresAt" timestamp`);
      }
    }
    if (hasTable("content_reports") && !hasColumn("content_reports", "description")) {
      await tx.execute(sql`ALTER TABLE public.content_reports ADD COLUMN IF NOT EXISTS "description" text`);
    }

    // Existing-but-incompatible deletion tables must not be silently treated
    // as healthy. Empty reads validate the exact runtime fields and roll back
    // this transaction if any required field is missing.
    await tx.execute(sql`SELECT "identityHash", "deletedAt" FROM public.deleted_account_identities LIMIT 0`);
    await tx.execute(sql`SELECT "userId", "createdAt", "completedAt" FROM public.account_media_purge_jobs LIMIT 0`);
    await tx.execute(sql`SELECT "deletedAt" FROM public.users LIMIT 0`);
  });
}
