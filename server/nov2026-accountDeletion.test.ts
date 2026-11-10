import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { redactSelfAccount, SELF_DELETE_ROWS, type DeletionDatabase } from "./accountDeletion";

function fixture(options: { failAt?: string; paid?: boolean; owns?: boolean } = {}) {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  let committed = false;
  let rolledBack = false;
  const db: DeletionDatabase = { transaction: async (work) => {
    try {
      const result = await work({ execute: async (query) => {
        const compiled = new PgDialect().sqlToQuery(query);
        queries.push(compiled);
        if (options.failAt && compiled.sql.includes(options.failAt)) throw Error("simulated schema mismatch");
        if (compiled.sql.includes('SELECT "id", "openId"')) return [{ id: 12, openId: "original-private-id", deletedAt: null }];
        if (compiled.sql.includes('SELECT "stripeSubscriptionId"')) return options.paid ? [{ stripeSubscriptionId: "sub_real", status: "active" }] : [];
        if (compiled.sql.includes("information_schema.tables")) return [...SELF_DELETE_ROWS.map(([table]) => ({ tableName: table })), ...["posts", "comments", "messages", "polls", "poll_options", "org_page_posts", "public_group_posts", "reels", "stories", "shop_listings", "content_reports", "subscriptions", "org_pages", "public_groups", "group_conversations"].map(tableName => ({ tableName }))];
        if (compiled.sql.startsWith('SELECT 1 FROM "org_pages"')) return options.owns ? [{}] : [];
        return [];
      } });
      committed = true; return result;
    } catch (e) { rolledBack = true; throw e; }
  } };
  return { db, queries, status: () => ({ committed, rolledBack }) };
}
describe("self-account transaction scope", () => {
  it("redacts only the bound user's rows and retains shared users/messages/comments/containers", async () => {
    const f = fixture(); await redactSelfAccount(f.db, 12);
    expect(f.status()).toEqual({ committed: true, rolledBack: false });
    expect(f.queries.some(q => q.sql.includes('UPDATE "messages"') && q.sql.includes('WHERE "senderId" =') && q.params.includes(12))).toBe(true);
    for (const table of ["users", "conversations", "messages", "comments", "posts", "org_pages", "public_groups"]) expect(f.queries.some(q => q.sql.startsWith(`DELETE FROM "${table}"`))).toBe(false);
    for (const q of f.queries.filter(q => q.sql.startsWith("DELETE FROM"))) { expect(q.sql).toContain("WHERE"); expect(q.params).toContain(12); }
    const identityInsert = f.queries.find(q => q.sql.includes('INSERT INTO "deleted_account_identities"'))!;
    expect(identityInsert.params[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(identityInsert.params).not.toContain("original-private-id");
    expect(f.queries.some(q => q.sql.includes('INSERT INTO "account_media_purge_jobs"'))).toBe(true);
  });
  it("rolls back on schema mismatch without committing a partial deletion", async () => {
    const f = fixture({ failAt: 'UPDATE "messages"' });
    await expect(redactSelfAccount(f.db, 12)).rejects.toThrow("simulated schema mismatch");
    expect(f.status()).toEqual({ committed: false, rolledBack: true });
    expect(f.queries.some(q => q.sql.includes('INSERT INTO "deleted_account_identities"'))).toBe(false);
  });
  it("blocks deletion with unresolved paid subscriptions before deleting rows", async () => {
    const f = fixture({ paid: true }); await expect(redactSelfAccount(f.db, 12)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(f.queries.some(q => q.sql.startsWith("DELETE FROM"))).toBe(false);
  });
  it("does not delete shared Pages or Groups when ownership needs transfer", async () => {
    const f = fixture({ owns: true }); await expect(redactSelfAccount(f.db, 12)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(f.queries.some(q => q.sql.startsWith("DELETE FROM"))).toBe(false);
  });
  it("rejects invalid account IDs", async () => {
    await expect(redactSelfAccount(fixture().db, -1)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
