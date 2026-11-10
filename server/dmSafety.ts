import { TRPCError } from "@trpc/server";

export function directMessageRecipient(
  conversation: { participant1Id: number; participant2Id: number },
  senderId: number,
): number {
  if (conversation.participant1Id === senderId) return conversation.participant2Id;
  if (conversation.participant2Id === senderId) return conversation.participant1Id;
  throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant." });
}

export async function assertDirectMessagingAllowed(
  senderId: number,
  recipientId: number,
  isBlocked: (blockerId: number, blockedId: number) => Promise<boolean>,
): Promise<void> {
  if (!Number.isInteger(senderId) || !Number.isInteger(recipientId) || senderId < 1 || recipientId < 1 || senderId === recipientId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Choose another valid member to message." });
  }
  const [blocked, blockedBy] = await Promise.all([
    isBlocked(senderId, recipientId),
    isBlocked(recipientId, senderId),
  ]);
  if (blocked || blockedBy) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Messaging is unavailable between these accounts." });
  }
}
