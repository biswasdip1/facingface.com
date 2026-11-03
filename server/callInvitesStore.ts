import { TRPCError } from "@trpc/server";
import { and, eq, or, sql } from "drizzle-orm";
import { conversations, groupConversations, groupMembers, messages } from "../drizzle/schema";
import { getDb } from "./db";

export async function requireCallInvitationDatabase() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Call invitations are temporarily unavailable." });
  return db;
}

/**
 * Opening an empty DM is not consent: a non-friend peer must have a two-way
 * exchange in this exact conversation. Read-only; never creates eligibility.
 */
export async function hasLegitimateDirectConversation(ownerId: number, peerId: number): Promise<boolean> {
  const db = await requireCallInvitationDatabase();
  const [conversation] = await db.select({ id: conversations.id }).from(conversations).where(and(
    or(
      and(eq(conversations.participant1Id, ownerId), eq(conversations.participant2Id, peerId)),
      and(eq(conversations.participant1Id, peerId), eq(conversations.participant2Id, ownerId)),
    ),
    sql`EXISTS (SELECT 1 FROM ${messages} WHERE ${messages.conversationId} = ${conversations.id}
      AND ${messages.senderId} = ${ownerId} AND ${messages.deletedAt} IS NULL)`,
    sql`EXISTS (SELECT 1 FROM ${messages} WHERE ${messages.conversationId} = ${conversations.id}
      AND ${messages.senderId} = ${peerId} AND ${messages.deletedAt} IS NULL)`,
  )).limit(1);
  return Boolean(conversation);
}

/** New private group and every membership commit together, never reuse history. */
export async function createPrivateInvitationGroup(ownerId: number, recipientIds: number[]): Promise<number> {
  const db = await requireCallInvitationDatabase();
  return db.transaction(async tx => {
    const [group] = await tx.insert(groupConversations).values({
      name: "Call with friends", createdBy: ownerId,
      description: "A new private conversation for this group call.",
    }).returning({ id: groupConversations.id });
    if (!group?.id) throw new Error("Group creation did not return an ID.");
    await tx.insert(groupMembers).values([
      { groupId: group.id, userId: ownerId, role: "admin" as const },
      ...recipientIds.map(userId => ({ groupId: group.id, userId, role: "member" as const })),
    ]);
    return group.id;
  });
}
