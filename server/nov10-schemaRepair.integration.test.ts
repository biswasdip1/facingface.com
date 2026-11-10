import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { ensureAccountDeletionSchema } from "./accountDeletionSchema";

const url = process.env.NOV10_REPAIR_TEST_DB_URL;
// This suite clears ONLY a named, disposable loopback database. Never DATABASE_URL.
if (url) {
  const parsed = new URL(url);
  if (parsed.hostname !== "127.0.0.1" || parsed.pathname !== "/facingface_repair_test") {
    throw new Error("Schema-repair integration tests require the dedicated local facingface_repair_test database.");
  }
}

describe.skipIf(!url).sequential("targeted Render schema repair — synthetic PostgreSQL only", () => {
  let client: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;
  beforeAll(() => {
    client = postgres(url!, { ssl: { rejectUnauthorized: false }, max: 4 });
    db = drizzle(client);
  });
  afterAll(async () => { await client?.end(); });
  beforeEach(async () => {
    await client.unsafe("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
    await client.unsafe(`
      CREATE TABLE public.users (id integer PRIMARY KEY, "openId" text, email text, "passwordHash" text, "isVerified" boolean);
      CREATE TABLE public.subscriptions (id integer PRIMARY KEY, "userId" integer, "stripeCustomerId" text, "stripeSubscriptionId" text,
        status text, "badgeGranted" boolean, "updatedAt" timestamp);
      CREATE TABLE public.content_reports (id integer PRIMARY KEY, reason text);
      INSERT INTO public.users VALUES (1, 'synthetic-active', 'synthetic@invalid.test', 'unchanged-hash', true);
      INSERT INTO public.subscriptions VALUES (10, 1, 'cus_synthetic', 'sub_synthetic', 'active', true, '2026-11-01');
      INSERT INTO public.content_reports VALUES (20, 'unchanged-report');
    `);
  });

  it("reproduces the missing-column failure, adds nullable schema and preserves all pre-existing billing/account fields", async () => {
    await expect(client`SELECT "deletedAt" FROM public.users`).rejects.toMatchObject({ code: "42703" });
    const beforeUsers = await client`SELECT * FROM public.users`;
    const beforeSubscriptions = await client`SELECT * FROM public.subscriptions`;
    await ensureAccountDeletionSchema(db);
    const users = await client`SELECT * FROM public.users`;
    expect(users).toEqual(beforeUsers.map(row => ({ ...row, deletedAt: null })));
    expect(await client`SELECT * FROM public.subscriptions`).toEqual(beforeSubscriptions.map(row => ({ ...row, tier: null, expiresAt: null })));
    expect(await client`SELECT * FROM public.content_reports`).toEqual([{ id: 20, reason: "unchanged-report", description: null }]);
    expect(await client`SELECT * FROM public.deleted_account_identities`).toHaveLength(0);
    expect(await client`SELECT * FROM public.account_media_purge_jobs`).toHaveLength(0);
    const column = await client`SELECT is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='deletedAt'`;
    expect(column).toEqual([{ is_nullable: "YES", column_default: null }]);
  });

  it("repeated startup preserves exact tombstones, identity hashes, job progress and paid entitlements", async () => {
    await ensureAccountDeletionSchema(db);
    await client.unsafe(`
      UPDATE public.subscriptions SET tier='golden', "expiresAt"='2027-01-01';
      INSERT INTO public.users VALUES (2, 'deleted:2', NULL, NULL, false, '2026-11-04');
      INSERT INTO public.deleted_account_identities VALUES (repeat('a',64), '2026-11-04');
      INSERT INTO public.account_media_purge_jobs VALUES (2,'2026-11-04',NULL),(3,'2026-11-04','2026-11-05');
    `);
    const snapshot = async () => ({
      users: await client`SELECT * FROM public.users ORDER BY id`,
      subscriptions: await client`SELECT * FROM public.subscriptions`,
      identities: await client`SELECT * FROM public.deleted_account_identities`,
      jobs: await client`SELECT * FROM public.account_media_purge_jobs ORDER BY "userId"`,
    });
    const before = await snapshot();
    await ensureAccountDeletionSchema(db);
    await ensureAccountDeletionSchema(db);
    expect(await snapshot()).toEqual(before);
    expect(await client`SELECT id FROM public.users WHERE "deletedAt" IS NULL`).toEqual([{ id: 1 }]);
  });

  it("supports absent optional billing/report tables without creating fictitious records", async () => {
    await client.unsafe("DROP TABLE public.subscriptions; DROP TABLE public.content_reports");
    await ensureAccountDeletionSchema(db);
    expect(await client`SELECT "deletedAt" FROM public.users`).toEqual([{ deletedAt: null }]);
    expect(await client`SELECT to_regclass('public.subscriptions') AS billing`).toEqual([{ billing: null }]);
  });

  it("rolls back every additive change on a malformed pre-existing deletion table", async () => {
    await client.unsafe("CREATE TABLE public.account_media_purge_jobs (broken integer); INSERT INTO public.account_media_purge_jobs VALUES (99)");
    await expect(ensureAccountDeletionSchema(db)).rejects.toThrow();
    const columns = await client`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='deletedAt'`;
    expect(columns).toHaveLength(0);
    expect(await client`SELECT to_regclass('public.deleted_account_identities') AS identities`).toEqual([{ identities: null }]);
    expect(await client`SELECT * FROM public.account_media_purge_jobs`).toEqual([{ broken: 99 }]);
    expect(await client`SELECT status, "stripeSubscriptionId" FROM public.subscriptions`).toEqual([{ status: "active", stripeSubscriptionId: "sub_synthetic" }]);
  });

  it("refuses to initialize an empty or wrong database", async () => {
    await client.unsafe("DROP TABLE public.users");
    await expect(ensureAccountDeletionSchema(db)).rejects.toThrow("public.users table is missing");
    expect(await client`SELECT to_regclass('public.deleted_account_identities') AS identities`).toEqual([{ identities: null }]);
  });

  it("refuses destructive conversion of an incompatible existing deletion marker", async () => {
    await client.unsafe('ALTER TABLE public.users ADD COLUMN "deletedAt" text');
    await expect(ensureAccountDeletionSchema(db)).rejects.toThrow("incompatible type");
    expect(await client`SELECT "openId", "passwordHash" FROM public.users`).toEqual([{ openId: "synthetic-active", passwordHash: "unchanged-hash" }]);
  });

  it("serializes overlapping startups without duplicate schema or subscription mutations", async () => {
    await Promise.all([ensureAccountDeletionSchema(db), ensureAccountDeletionSchema(db)]);
    expect(await client`SELECT "deletedAt" FROM public.users`).toEqual([{ deletedAt: null }]);
    expect(await client`SELECT status, "stripeSubscriptionId" FROM public.subscriptions`).toEqual([{ status: "active", stripeSubscriptionId: "sub_synthetic" }]);
  });
});
