import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { conversations, groupConversations, groupMembers } from "../drizzle/schema";
const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => mocks);
import { createPrivateInvitationGroup, hasLegitimateDirectConversation } from "./callInvitesStore";
beforeEach(() => vi.resetAllMocks());
describe("private invitation group transaction", () => {
  function fixture() {
    const returning = vi.fn().mockResolvedValue([{ id: 71 }]);
    const groupValues = vi.fn(() => ({ returning }));
    const memberValues = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn(table => ({ values: table === groupConversations ? groupValues : memberValues }));
    const transaction = vi.fn(async action => action({ insert }));
    mocks.getDb.mockResolvedValue({ transaction });
    return { transaction, insert, returning, groupValues, memberValues };
  }
  it("creates a fresh private conversation and exactly one owner-admin plus selected members in the same transaction", async () => {
    const fake = fixture();
    expect(await createPrivateInvitationGroup(9, [2, 3, 4])).toBe(71);
    expect(fake.transaction).toHaveBeenCalledTimes(1);
    expect(fake.insert.mock.calls.map(([table]) => table)).toEqual([groupConversations, groupMembers]);
    expect(fake.groupValues).toHaveBeenCalledWith({ name: "Call with friends", createdBy: 9, description: "A new private conversation for this group call." });
    expect(fake.memberValues).toHaveBeenCalledWith([
      { groupId: 71, userId: 9, role: "admin" },
      { groupId: 71, userId: 2, role: "member" },
      { groupId: 71, userId: 3, role: "member" },
      { groupId: 71, userId: 4, role: "member" },
    ]);
  });
  it("propagates membership failures out of the transaction so the group rolls back", async () => {
    const fake = fixture();
    fake.memberValues.mockRejectedValue(new Error("membership failure"));
    await expect(createPrivateInvitationGroup(1, [2, 3])).rejects.toThrow("membership failure");
    expect(fake.transaction).toHaveBeenCalledTimes(1);
  });
  it("does not create memberships if no valid group id was returned", async () => {
    const fake = fixture();
    fake.returning.mockResolvedValue([]);
    await expect(createPrivateInvitationGroup(1, [2, 3])).rejects.toThrow("Group creation");
    expect(fake.memberValues).not.toHaveBeenCalled();
  });
  it("fails closed if no database is available", async () => {
    mocks.getDb.mockResolvedValue(null);
    await expect(createPrivateInvitationGroup(1, [2, 3])).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});
describe("legitimate direct peer eligibility", () => {
  it.each([{ rows: [] }, { rows: [{ id: 20 }] }])("is read-only and accepts only a returned eligible row (%j)", async ({ rows }) => {
    const limit = vi.fn().mockResolvedValue(rows);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const insert = vi.fn();
    mocks.getDb.mockResolvedValue({ select, insert });
    expect(await hasLegitimateDirectConversation(9, 2)).toBe(rows.length > 0);
    expect(from).toHaveBeenCalledWith(conversations);
    expect(insert).not.toHaveBeenCalled();
    const query = new PgDialect().sqlToQuery(where.mock.calls[0][0]);
    expect(query.sql).toContain('"conversations"."participant1Id"');
    expect(query.sql).toContain('"conversations"."participant2Id"');
    expect(query.sql.match(/EXISTS/g)).toHaveLength(2);
    expect(query.sql.match(/"messages"\."senderId"/g)).toHaveLength(2);
    expect(query.sql.match(/"messages"\."deletedAt" IS NULL/g)).toHaveLength(2);
    expect(query.params).toEqual([9, 2, 2, 9, 9, 2]);
  });
  it("database unavailability cannot become a positive eligibility result", async () => {
    mocks.getDb.mockResolvedValue(null);
    await expect(hasLegitimateDirectConversation(1, 2)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});
