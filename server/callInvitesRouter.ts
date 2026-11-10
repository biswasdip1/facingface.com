import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { GROUP_CALL_WAITING_MS } from "../shared/groupCall";
import type { GroupCallInvitationPayload, StartGroupCallInvitationResult } from "../shared/callInvites";
import { protectedProcedure, router } from "./_core/trpc";
import {
  areFriends, createCallRoom, getCallRoom, getOrCreateConversation,
  getUserById, isUserBlocked, sendMessage,
} from "./db";
import { emitDirectMessageRefresh, emitGroupCallInvitation } from "./callSignaling";
import { createRateLimiter } from "./rateLimit";
import { createPrivateInvitationGroup, hasLegitimateDirectConversation, requireCallInvitationDatabase } from "./callInvitesStore";

/** Owner-scoped, not IP-scoped: changing tabs or addresses cannot bypass it. */
export const callInviteStartLimiter = createRateLimiter({
  maxAttempts: 2, windowMs: 60_000, action: "group-call invitations",
});

const startInput = z.object({
  peerId: z.number().int().positive(),
  inviteeIds: z.array(z.number().int().positive()).min(1).max(2)
    .refine(ids => new Set(ids).size === ids.length, "Choose distinct friends."),
  type: z.enum(["audio", "video"]),
}).strict().refine(input => !input.inviteeIds.includes(input.peerId), {
  message: "The original call peer is already included.", path: ["inviteeIds"],
});

/** Server-owned origin only; ignore request Host/Origin and all client URLs. */
export function groupCallInvitationUrl(roomId: number): string {
  let origin = "https://www.facingface.com";
  try {
    const configured = new URL(process.env.PUBLIC_APP_URL ?? origin);
    if (configured.protocol === "https:" && !configured.username && !configured.password) {
      origin = configured.origin;
    }
  } catch { /* Invalid deployment configuration uses the canonical public origin. */ }
  return new URL(`/calls/group/${roomId}`, origin).href;
}

export const callInvitesRouter = router({
  start: protectedProcedure.input(startInput).mutation(async ({ ctx, input }): Promise<StartGroupCallInvitationResult> => {
    const ownerId = ctx.user.id;
    const recipientIds = [input.peerId, ...input.inviteeIds];
    if (recipientIds.includes(ownerId)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot invite yourself." });
    }
    callInviteStartLimiter.check(String(ownerId));

    // Validate every account and relationship before creating any durable data.
    const people = await Promise.all([ownerId, ...recipientIds].map(id => getUserById(id)));
    const now = Date.now();
    if (people.some(person => !person || (person.suspendedUntil && person.suspendedUntil.getTime() > now))) {
      throw new TRPCError({ code: "FORBIDDEN", message: "One or more accounts are not available for call invitations." });
    }
    const memberIds = [ownerId, ...recipientIds];
    for (let first = 0; first < memberIds.length; first++) {
      for (let second = first + 1; second < memberIds.length; second++) {
        const [blocked, blockedBy] = await Promise.all([
          isUserBlocked(memberIds[first], memberIds[second]),
          isUserBlocked(memberIds[second], memberIds[first]),
        ]);
        if (blocked || blockedBy) {
          throw new TRPCError({ code: "FORBIDDEN", message: "These people cannot be invited to the same call." });
        }
      }
    }
    if (!await areFriends(ownerId, input.peerId) && !await hasLegitimateDirectConversation(ownerId, input.peerId)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "The original peer must be an accepted friend or have an existing two-way direct conversation with you." });
    }
    const inviteeFriendships = await Promise.all(input.inviteeIds.map(id => areFriends(ownerId, id)));
    if (inviteeFriendships.some(isFriend => !isFriend)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You can invite only your accepted friends." });
    }
    await requireCallInvitationDatabase();
    // sendMessage's legacy fallback permits plaintext when no key is configured.
    // This new invitation path fails closed instead of storing unencrypted links.
    const encryptionSecret = process.env.CHAT_ENCRYPTION_KEY || process.env.JWT_SECRET || process.env.SESSION_SECRET || "";
    if (encryptionSecret.length < 16) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Encrypted call invitations are temporarily unavailable." });
    }

    let stage = "creating the private group";
    try {
      const groupId = await createPrivateInvitationGroup(ownerId, recipientIds);
      stage = "creating the group call";
      // Existing helper authorizes the host and creates NO participants/media.
      // It owns a separate transaction, so the group must be committed first.
      const roomId = await createCallRoom({ groupId, hostId: ownerId, type: input.type });
      const room = await getCallRoom(roomId, ownerId);
      if (!room || room.groupId !== groupId || room.hostId !== ownerId || room.status !== "waiting" || room.type !== input.type) {
        throw new Error("The new invitation room is not available.");
      }
      const expiresAt = room.startedAt.getTime() + GROUP_CALL_WAITING_MS;
      if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) throw new Error("The invitation room has expired.");
      const fromName = people[0]!.name?.trim().slice(0, 120) || "Someone";
      const url = groupCallInvitationUrl(roomId);
      // A fixed prefix cannot be confused with the encryption helper's ffenc:v1
      // legacy marker, even when a malicious display name begins with it.
      const text = `Group ${input.type} call invitation from ${fromName}. Join when you are ready: ${url}\nThis invitation expires at ${new Date(expiresAt).toISOString()}. Your current call stays open until you choose to join.`;
      const savedConversations: number[] = [];
      stage = "saving the invitations";
      for (const recipientId of recipientIds) {
        // Eligibility is already established; creating a DM here only delivers
        // the invitation and never grants peer/group eligibility retroactively.
        const conversation = await getOrCreateConversation(ownerId, recipientId);
        if (!Number.isInteger(conversation.id) || conversation.id <= 0
          || !((conversation.participant1Id === ownerId && conversation.participant2Id === recipientId)
            || (conversation.participant2Id === ownerId && conversation.participant1Id === recipientId))) {
          throw new Error("Invitation conversation has invalid participants.");
        }
        const saved = await sendMessage({ conversationId: conversation.id, senderId: ownerId, text });
        if (!Number.isInteger(saved.id) || saved.id <= 0) throw new Error("Invitation message was not saved.");
        savedConversations.push(conversation.id);
      }
      if (Date.now() >= expiresAt) throw new Error("The invitation room expired before delivery completed.");
      // No unrelated notification enum is reused: existing notifications have
      // neither a call-invitation type nor URL fields. DMs are the durable inbox.
      const payload: GroupCallInvitationPayload = { roomId, groupId, fromId: ownerId, fromName, type: input.type, expiresAt };
      for (let index = 0; index < recipientIds.length; index++) {
        emitDirectMessageRefresh([ownerId, recipientIds[index]], savedConversations[index]);
      }
      emitGroupCallInvitation(recipientIds, payload);
      return { roomId, groupId, invitedUserIds: recipientIds, expiresAt };
    } catch (cause) {
      // Preserve durable records, including any delivered invitation; never
      // delete a group/DM or alter the existing one-to-one call on failure.
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR", cause,
        message: `There was a problem ${stage}. Invitations were not fully delivered; your current call has not been changed. Please check your messages before trying again.`,
      });
    }
  }),
});
