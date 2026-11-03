export type GroupReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";

export type GroupReactionRecord = {
  userId: number;
  reaction: string;
  createdAt: Date;
};

const validTypes = new Set<GroupReactionType>(["like", "love", "haha", "wow", "sad", "angry"]);

export function summarisePublicGroupReactions(records: GroupReactionRecord[], viewerId?: number | null) {
  const latestByMember = new Map<number, GroupReactionRecord>();
  for (const record of records) {
    if (!validTypes.has(record.reaction as GroupReactionType)) continue;
    const existing = latestByMember.get(record.userId);
    if (!existing || record.createdAt.getTime() > existing.createdAt.getTime()) {
      latestByMember.set(record.userId, record);
    }
  }

  const effective = [...latestByMember.values()];
  const counts: Record<string, number> = {};
  for (const record of effective) counts[record.reaction] = (counts[record.reaction] ?? 0) + 1;
  const recent = [...effective].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5);
  const myReaction = viewerId ? (latestByMember.get(viewerId)?.reaction as GroupReactionType | undefined) ?? null : null;
  return { counts, total: effective.length, recent, myReaction };
}
