import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { callParticipants, callRooms, callSignals, groupConversations, groupMembers, blocks } from "../drizzle/schema";
import { GROUP_CALL_STALE_MS, GROUP_CALL_WAITING_MS } from "../shared/groupCall";

// Never use DATABASE_URL here: this suite opts into an isolated disposable database.
// Each worker gets its own schema; no global migration or production DDL is run.
const testUrl = process.env.GROUP_CALL_TEST_DATABASE_URL;
const schema = `group_call_test_${process.pid}_${Date.now()}`;
const holder = vi.hoisted(() => ({ client: null as unknown as ReturnType<typeof postgres> }));
vi.mock("postgres", async importOriginal => {
  const actual = await importOriginal<typeof import("postgres")>();
  return { ...actual, default: ((...args: Parameters<typeof postgres>) => holder.client ?? actual.default(...args)) };
});
let client: ReturnType<typeof postgres>;
let admin: ReturnType<typeof postgres>;
let connection: ReturnType<typeof drizzle>;
let helpers: typeof import("./db");

async function insertPerson(id: number) {
  await client`INSERT INTO users (id, name, avatar) VALUES (${id}, ${`Person ${id}`}, ${`/avatar-${id}`})`;
}
async function newGroup() {
  const [group] = await connection.insert(groupConversations).values({ name: "Private call group", createdBy: 1 }).returning();
  await connection.insert(groupMembers).values([1, 2, 3, 4, 5, 6].map(userId => ({ groupId: group.id, userId })));
  return group.id;
}
async function newRoom(groupId?: number) {
  return helpers.createCallRoom({ groupId, hostId: 1, type: "video" });
}
async function active(roomId: number) {
  return helpers.getActiveCallParticipants(roomId);
}
async function staleUser(roomId: number, userId: number) {
  await client`UPDATE call_participants SET "joinedAt" = ${new Date(Date.now() - GROUP_CALL_STALE_MS - 1000).toISOString()} WHERE "roomId" = ${roomId} AND "userId" = ${userId}`;
}
async function send(roomId: number, fromUserId = 1, toUserId = 2) {
  return helpers.sendCallSignal({ roomId, fromUserId, toUserId, type: "offer", payload: JSON.stringify({ type: "offer", sdp: "v=0\r\n" }) });
}

const suite = testUrl ? describe : describe.skip;
suite("durable group call helpers (real PostgreSQL row locks)", () => {
  beforeAll(async () => {
    const realPostgres = (await vi.importActual<typeof import("postgres")>("postgres")).default;
    admin = realPostgres(testUrl!, { max: 1 });
    await admin.unsafe(`CREATE SCHEMA "${schema}"`);
    client = realPostgres(testUrl!, { max: 10, connection: { search_path: schema } });
    holder.client = client;
    connection = drizzle(client);
    process.env.DATABASE_URL = "postgres://test-injected-connection.invalid";
    helpers = await import("./db");
    await client.unsafe(`
      CREATE TABLE group_conversations (id serial PRIMARY KEY, name varchar(100) NOT NULL, description varchar(500), avatar varchar(512), "createdBy" integer NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now());
      CREATE TABLE group_members (id serial PRIMARY KEY, "groupId" integer NOT NULL, "userId" integer NOT NULL, role text NOT NULL DEFAULT 'member', "joinedAt" timestamp NOT NULL DEFAULT now(), "mutedUntil" timestamp);
      CREATE TABLE call_rooms (id serial PRIMARY KEY, "groupId" integer, "hostId" integer NOT NULL, status text NOT NULL DEFAULT 'waiting', type text NOT NULL DEFAULT 'video', "startedAt" timestamp NOT NULL DEFAULT now(), "endedAt" timestamp);
      CREATE TABLE call_participants (id serial PRIMARY KEY, "roomId" integer NOT NULL, "userId" integer NOT NULL, "joinedAt" timestamp NOT NULL DEFAULT now(), "leftAt" timestamp);
      CREATE TABLE call_signals (id serial PRIMARY KEY, "roomId" integer NOT NULL, "fromUserId" integer NOT NULL, "toUserId" integer NOT NULL, type varchar(30) NOT NULL, payload text NOT NULL, consumed boolean NOT NULL DEFAULT false, "createdAt" timestamp NOT NULL DEFAULT now());
      CREATE TABLE users (id integer PRIMARY KEY, name text, avatar text, email text DEFAULT 'secret-email', "passwordHash" text DEFAULT 'secret-hash');
      CREATE TABLE blocks (id serial PRIMARY KEY, "blockerId" integer NOT NULL, "blockedId" integer NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now());
    `);
  });
  beforeEach(async () => {
    await client.unsafe('TRUNCATE call_signals, call_participants, call_rooms, group_members, group_conversations, users, blocks RESTART IDENTITY');
    for (let id = 1; id <= 6; id++) await insertPerson(id);
  });
  afterAll(async () => {
    holder.client = null as unknown as ReturnType<typeof postgres>;
    if (client) await client.end();
    if (admin) {
      await admin.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.end();
    }
  });

  it("creates waiting room without ghost participants, authorizes prejoin member reads, denies strangers", async () => {
    const groupId = await newGroup();
    const roomId = await newRoom(groupId);
    expect(await active(roomId)).toEqual([]);
    expect((await helpers.getCallRoom(roomId, 2))?.status).toBe("waiting");
    await expect(helpers.getCallRoom(roomId, 99)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(helpers.joinCallRoom(roomId, 99)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("serializes simultaneous creates to the same group room, independent of requested type", async () => {
    const groupId = await newGroup();
    const ids = await Promise.all([1, 2, 3, 4, 5].map(hostId => helpers.createCallRoom({ groupId, hostId, type: hostId % 2 ? "audio" : "video" })));
    expect(new Set(ids).size).toBe(1);
    expect(await connection.select().from(callRooms)).toHaveLength(1);
    expect((await helpers.getActiveCallRoomForGroup(groupId, 2))?.id).toBe(ids[0]);
    expect(await active(ids[0])).toEqual([]);
  });
  it("atomically admits four simultaneous users and rejects the fifth", async () => {
    const roomId = await newRoom(await newGroup());
    const joins = await Promise.allSettled([1, 2, 3, 4, 5].map(id => helpers.joinCallRoom(roomId, id)));
    expect(joins.filter(row => row.status === "fulfilled")).toHaveLength(4);
    const rejected = joins.find(row => row.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: "CONFLICT" });
    expect(new Set((await active(roomId)).map(row => row.userId)).size).toBe(4);
  });
  it("same-user concurrent/repeated joins are idempotent without a uniqueness constraint", async () => {
    const roomId = await newRoom(await newGroup());
    await Promise.all(Array.from({ length: 10 }, () => helpers.joinCallRoom(roomId, 1)));
    expect(await active(roomId)).toHaveLength(1);
    expect(await connection.select().from(callParticipants)).toHaveLength(1);
    await helpers.joinCallRoom(roomId, 2);
    await send(roomId);
    await helpers.joinCallRoom(roomId, 1);
    expect(await helpers.getUnconsumedSignals(roomId, 2)).toHaveLength(1);
  });
  it("deduplicates legacy rows and counts distinct active people", async () => {
    const roomId = await newRoom(await newGroup());
    await connection.insert(callParticipants).values([1, 1, 1, 2].map(userId => ({ roomId, userId })));
    await connection.update(callRooms).set({ status: "active" }).where(eq(callRooms.id, roomId));
    await helpers.joinCallRoom(roomId, 3);
    expect((await active(roomId)).map(row => row.userId).sort()).toEqual([1, 2, 3]);
    const historical = await connection.select().from(callParticipants);
    expect(historical.filter(row => row.leftAt !== null)).toHaveLength(2);
  });
  it("normalizes pre-repair overfull rooms to four distinct active people", async () => {
    const roomId = await newRoom(await newGroup());
    await connection.insert(callParticipants).values([1, 2, 3, 4, 5, 6].map(userId => ({ roomId, userId })));
    await connection.update(callRooms).set({ status: "active" }).where(eq(callRooms.id, roomId));
    expect(await active(roomId)).toHaveLength(4);
    const rows = await connection.select().from(callParticipants);
    expect(rows.filter(row => row.leftAt !== null)).toHaveLength(2);
  });
  it("reuses a historical row on rejoin and clears incoming/outgoing stale signals", async () => {
    const roomId = await newRoom(await newGroup());
    await helpers.joinCallRoom(roomId, 1);
    await helpers.joinCallRoom(roomId, 2);
    const originalId = (await active(roomId)).find(row => row.userId === 2)!.id;
    await helpers.leaveCallRoom(roomId, 2);
    await connection.insert(callSignals).values({ roomId, fromUserId: 1, toUserId: 2, type: "offer", payload: "old" });
    await helpers.joinCallRoom(roomId, 2);
    expect((await active(roomId)).find(row => row.userId === 2)?.id).toBe(originalId);
    expect(await connection.select().from(callSignals)).toEqual([]);
    expect(await connection.select().from(callParticipants)).toHaveLength(2);
  });
  it("expires abandoned participants before capacity check while retaining heartbeat peers", async () => {
    const roomId = await newRoom(await newGroup());
    for (const id of [1, 2, 3, 4]) await helpers.joinCallRoom(roomId, id);
    await staleUser(roomId, 2);
    await helpers.joinCallRoom(roomId, 5);
    expect((await active(roomId)).map(row => row.userId).sort()).toEqual([1, 3, 4, 5]);
  });
  it("getRoom/poll heartbeat refreshes joinedAt, but does not autojoin a reader", async () => {
    const roomId = await newRoom(await newGroup());
    await helpers.joinCallRoom(roomId, 1);
    await client`UPDATE call_participants SET "joinedAt" = ${new Date(Date.now() - 30000).toISOString()} WHERE "roomId" = ${roomId}`;
    await helpers.getCallRoom(roomId, 1);
    expect(Date.now() - (await active(roomId))[0].joinedAt.getTime()).toBeLessThan(3000);
    await helpers.getCallRoom(roomId, 3);
    expect(await active(roomId)).toHaveLength(1);
    await client`UPDATE call_participants SET "joinedAt" = ${new Date(Date.now() - 30000).toISOString()} WHERE "roomId" = ${roomId}`;
    expect(await helpers.getUnconsumedSignals(roomId, 1)).toEqual([]);
    expect(Date.now() - (await active(roomId))[0].joinedAt.getTime()).toBeLessThan(3000);
  });
  it("ends empty stale calls durably even when Join is rejected; ended calls never revive", async () => {
    const roomId = await newRoom(await newGroup());
    await helpers.joinCallRoom(roomId, 1);
    await staleUser(roomId, 1);
    await expect(helpers.joinCallRoom(roomId, 2)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect((await connection.select().from(callRooms))[0].status).toBe("ended");
    await helpers.updateCallRoomStatus(roomId, "active");
    expect((await helpers.getCallRoom(roomId, 1))?.status).toBe("ended");
    await expect(helpers.joinCallRoom(roomId, 1)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("expires unused waiting rooms and creates a fresh room without reviving the old one", async () => {
    const groupId = await newGroup();
    const oldId = await newRoom(groupId);
    await connection.update(callRooms).set({ startedAt: new Date(Date.now() - GROUP_CALL_STALE_MS - 1000) }).where(eq(callRooms.id, oldId));
    expect((await helpers.getActiveCallRoomForGroup(groupId, 1))?.id).toBe(oldId);
    await connection.update(callRooms).set({ startedAt: new Date(Date.now() - GROUP_CALL_WAITING_MS - 1000) }).where(eq(callRooms.id, oldId));
    expect(await helpers.getActiveCallRoomForGroup(groupId, 1)).toBeNull();
    expect((await helpers.getCallRoom(oldId, 1))?.status).toBe("ended");
    expect(await newRoom(groupId)).not.toBe(oldId);
  });
  it("only nongroup host can read/join, and outsider Leave is denied", async () => {
    const roomId = await newRoom();
    expect((await helpers.getCallRoom(roomId, 1))?.hostId).toBe(1);
    await expect(helpers.getCallRoom(roomId, 2)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(helpers.joinCallRoom(roomId, 2)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(helpers.leaveCallRoom(roomId, 2)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("removed members cannot read/join/poll and are retired from active participants", async () => {
    const groupId = await newGroup();
    const roomId = await newRoom(groupId);
    await helpers.joinCallRoom(roomId, 1);
    await helpers.joinCallRoom(roomId, 2);
    await client`DELETE FROM group_members WHERE "groupId" = ${groupId} AND "userId" = 2`;
    for (const operation of [() => helpers.getCallRoom(roomId, 2), () => helpers.joinCallRoom(roomId, 2), () => helpers.getUnconsumedSignals(roomId, 2)]) {
      await expect(operation()).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect((await active(roomId)).map(row => row.userId)).toEqual([1]);
    await expect(helpers.leaveCallRoom(roomId, 2)).resolves.toBeUndefined();
  });
  it("leave is idempotent, authorized member prejoin leave is harmless, final departure ends room", async () => {
    const roomId = await newRoom(await newGroup());
    await helpers.leaveCallRoom(roomId, 3);
    expect((await helpers.getCallRoom(roomId, 1))?.status).toBe("waiting");
    await helpers.joinCallRoom(roomId, 1);
    await helpers.joinCallRoom(roomId, 2);
    await helpers.leaveCallRoom(roomId, 2);
    await helpers.leaveCallRoom(roomId, 2);
    expect((await helpers.getCallRoom(roomId, 1))?.status).toBe("active");
    await helpers.leaveCallRoom(roomId, 1);
    await helpers.leaveCallRoom(roomId, 1);
    expect((await helpers.getCallRoom(roomId, 1))?.status).toBe("ended");
  });
  it.each([true, false])("denies durable join across a block in either direction (%s)", async outbound => {
    const roomId = await newRoom(await newGroup());
    await helpers.joinCallRoom(roomId, 1);
    await connection.insert(blocks).values({ blockerId: outbound ? 1 : 2, blockedId: outbound ? 2 : 1 });
    await expect(helpers.joinCallRoom(roomId, 2)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await active(roomId)).toHaveLength(1);
  });
  it("selects only id/name/avatar in durable participant profiles", async () => {
    const roomId = await newRoom(await newGroup());
    await helpers.joinCallRoom(roomId, 1);
    const [row] = await active(roomId);
    expect(row.user).toEqual({ id: 1, name: "Person 1", avatar: "/avatar-1" });
    expect(JSON.stringify(row)).not.toContain("secret-");
  });
  it("requires both active same-room participants, delivers ordered once, and rejects stale/self/invalid", async () => {
    const groupId = await newGroup();
    const roomId = await newRoom(groupId);
    await helpers.joinCallRoom(roomId, 1);
    await expect(send(roomId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await helpers.joinCallRoom(roomId, 2);
    await send(roomId);
    await helpers.sendCallSignal({ roomId, fromUserId: 1, toUserId: 2, type: "ice-candidate", payload: '{"candidate":"candidate:x"}' });
    const signals = await helpers.getUnconsumedSignals(roomId, 2);
    expect(signals.map(row => row.type)).toEqual(["offer", "ice-candidate"]);
    expect(await helpers.getUnconsumedSignals(roomId, 2)).toEqual([]);
    await expect(send(roomId, 1, 1)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(helpers.sendCallSignal({ roomId, fromUserId: 1, toUserId: 2, type: "offer", payload: "[]" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await staleUser(roomId, 2);
    await expect(send(roomId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await active(roomId)).map(row => row.userId)).toEqual([1]);
  });
  it("does not signal a participant who only belongs to a different room", async () => {
    const room1 = await newRoom(await newGroup());
    const room2 = await newRoom(await newGroup());
    await helpers.joinCallRoom(room1, 1);
    await helpers.joinCallRoom(room2, 2);
    await expect(send(room1)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("filters queued signals from removed or newly blocked senders", async () => {
    const groupId = await newGroup();
    const roomId = await newRoom(groupId);
    await helpers.joinCallRoom(roomId, 1);
    await helpers.joinCallRoom(roomId, 2);
    await send(roomId);
    await connection.insert(blocks).values({ blockerId: 2, blockedId: 1 });
    expect(await helpers.getUnconsumedSignals(roomId, 2)).toEqual([]);
    await connection.delete(blocks);
    await send(roomId);
    await client`DELETE FROM group_members WHERE "groupId" = ${groupId} AND "userId" = 1`;
    expect(await helpers.getUnconsumedSignals(roomId, 2)).toEqual([]);
  });
});
