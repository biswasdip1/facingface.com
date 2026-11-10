import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { getTableName, is, sql } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "../drizzle/schema";
import { redactSelfAccount, type DeletionDatabase } from "./accountDeletion";

const authorizedUrl = "postgresql://ubuntu@127.0.0.1:55432/facingface_test";
const enabled = process.env.FF_LOCAL_SQL_TEST === "1" && process.env.DATABASE_URL === authorizedUrl;
const suite = enabled ? describe : describe.skip;
let client: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;
let nextId = 50000;
const tables = Object.values(schema).filter((value): value is PgTable => is(value, PgTable));
const skipTables = new Set(["deleted_account_identities", "account_media_purge_jobs", "website_notices", "adminBroadcasts"]);
const containers = new Set(["org_pages", "public_groups", "group_conversations"]);

async function seedPair() {
  const target = nextId++; const peer = nextId++;
  await db.insert(schema.users).values([target, peer].map(id => ({ id, openId: `sql-test-${id}`, email: `sql-test-${id}@invalid.test`, name: `Private ${id}`, passwordHash: "secret-hash", verificationToken: `private-token-${id}`, emailVerified: true })));
  for (const table of tables) {
    const name = getTableName(table);
    if (name === "users" || skipTables.has(name)) continue;
    for (const id of containers.has(name) || name === "suggested_page_exclusions" ? [peer] : [target, peer]) {
      const values: Record<string, unknown> = {};
      for (const [key, column] of Object.entries(table)) {
        if (!column || typeof column !== "object" || !("dataType" in column) || !("name" in column)) continue;
        const col = column as any;
        if (key === "id") values[key] = id;
        else if (col.enumValues?.length) values[key] = col.enumValues[0];
        else if (col.dataType === "number") values[key] = key === "birthDay" || key === "birthMonth" ? 1 : id;
        else if (col.dataType === "boolean") values[key] = false;
        else if (col.dataType === "date") values[key] = new Date("2027-01-01T00:00:00Z");
        else if (col.dataType === "json") values[key] = [];
        else if (col.dataType === "string") values[key] = col.columnType === "PgNumeric" ? "1.00" : `p${id}`;
      }
      if (name === "subscriptions") { values.status = "cancelled"; values.stripeSubscriptionId = null; }
      if (name === "active_sessions") values.tokenHash = `token-${id}`;
      if (name === "conversations") { values.participant1Id = target; values.participant2Id = peer; }
      if (name === "users") continue;
      if (name === "page_followers" || name === "page_admins" || name === "suggested_page_exclusions") values.pageId = peer;
      if (name === "public_group_members" || name === "public_group_posts") values.groupId = peer;
      if (name === "group_members" || name === "group_messages") values.groupId = peer;
      if (name === "org_page_posts") values.pageId = peer;
      if (name === "posts") { values.pageId = null; values.linkSiteName = null; values.isFlagged = false; }
      if (name === "messages") values.deletedAt = null;
      if (name === "totp_secrets") { values.enabled = false; values.backupCodes = "[]"; }
      await db.insert(table).values(values as any);
    }
  }
  return { target, peer };
}
async function snapshotPeer(peer: number) {
  const result: Record<string, unknown> = {};
  for (const table of tables) {
    const name = getTableName(table); if (skipTables.has(name)) continue;
    const columns = getTableConfig(table).columns;
    const key = columns.find(c => c.name === "id") || columns.find(c => c.name === "userId");
    if (!key) continue;
    result[name] = await client.unsafe(`SELECT row_to_json(t) AS row FROM "${name}" t WHERE "${key.name}" = $1`, [peer]);
  }
  return JSON.parse(JSON.stringify(result));
}

suite("isolated PostgreSQL self-account integration", () => {
  beforeAll(() => { client = postgres(authorizedUrl, { ssl: false, max: 1 }); db = drizzle(client); });
  afterAll(async () => { await client?.end(); });
  it("executes every canonical optional-table path and preserves all peer rows", async () => {
    const { target, peer } = await seedPair(); const before = await snapshotPeer(peer);
    await redactSelfAccount(db as unknown as DeletionDatabase, target);
    expect(await snapshotPeer(peer)).toEqual(before);
    const [user] = await client`SELECT * FROM users WHERE id = ${target}`;
    expect(user.deletedAt).not.toBeNull(); expect(user.name).toBe("Deleted member");
    expect(user.email).toBeNull(); expect(user.passwordHash).toBeNull(); expect(user.openId).toBe(`deleted:${target}`);
    const [post] = await client`SELECT * FROM posts WHERE id = ${target}`;
    expect(post.text).toBe("[Deleted]"); expect(post.mediaUrl).toBeNull(); expect(post.isFlagged).toBe(true);
    const [message] = await client`SELECT * FROM messages WHERE id = ${target}`;
    expect(message.text).toBeNull(); expect(message.fileUrl).toBeNull(); expect(message.deletedAt).not.toBeNull();
    expect((await client`SELECT * FROM active_sessions WHERE "userId" = ${target}`).length).toBe(0);
    expect((await client`SELECT * FROM account_media_purge_jobs WHERE "userId" = ${target}`).length).toBe(1);
    await expect(redactSelfAccount(db as unknown as DeletionDatabase, target)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await snapshotPeer(peer)).toEqual(before);
  }, 30_000);
  it("active paid subscription blocks deletion and leaves credentials/content intact", async () => {
    const { target } = await seedPair();
    await client`UPDATE subscriptions SET "stripeSubscriptionId" = 'sub_test_only', status = 'active' WHERE "userId" = ${target}`;
    await expect(redactSelfAccount(db as unknown as DeletionDatabase, target)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    const [user] = await client`SELECT * FROM users WHERE id = ${target}`; expect(user.deletedAt).toBeNull(); expect(user.passwordHash).toBe("secret-hash");
  }, 30_000);
  it("owned shared group blocks deletion without deleting group members", async () => {
    const { target, peer } = await seedPair();
    await client`UPDATE public_groups SET "createdBy" = ${target} WHERE id = ${peer}`;
    await expect(redactSelfAccount(db as unknown as DeletionDatabase, target)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect((await client`SELECT * FROM public_group_members WHERE "groupId" = ${peer}`).length).toBe(2);
  }, 30_000);
  it("real PostgreSQL error rolls back preceding credential/content changes", async () => {
    const { target } = await seedPair();
    const wrapped: DeletionDatabase = { transaction: (work) => db.transaction(async tx => work({ execute: async query => {
      const { PgDialect } = await import("drizzle-orm/pg-core");
      if (new PgDialect().sqlToQuery(query).sql.startsWith('UPDATE "messages"')) return tx.execute(sql`SELECT "deliberately_missing_test_column" FROM "messages"`);
      return tx.execute(query);
    } })) };
    await expect(redactSelfAccount(wrapped, target)).rejects.toThrow();
    expect((await client`SELECT * FROM active_sessions WHERE "userId" = ${target}`).length).toBe(1);
    const [user] = await client`SELECT * FROM users WHERE id = ${target}`; expect(user.deletedAt).toBeNull();
    const [post] = await client`SELECT * FROM posts WHERE id = ${target}`; expect(post.text).toBe(`p${target}`);
  }, 30_000);
});
