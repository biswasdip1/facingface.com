export type DurableReaction = "like" | "love" | "haha" | "wow" | "sad" | "angry" | "seen";

export type DurablePostReactor = {
  userId: number;
  name: string | null;
  avatar: string | null;
  reaction: DurableReaction;
};

/**
 * Keeps one effective reaction for each member. Enhanced typed reactions are
 * supplied first and therefore take precedence over legacy Like records.
 */
export function mergePostReactors(
  enhanced: DurablePostReactor[],
  legacyLikes: Array<Omit<DurablePostReactor, "reaction">>,
): DurablePostReactor[] {
  const effective = new Map<number, DurablePostReactor>();
  for (const reactor of enhanced) {
    if (!effective.has(reactor.userId)) effective.set(reactor.userId, reactor);
  }
  for (const liker of legacyLikes) {
    if (!effective.has(liker.userId)) effective.set(liker.userId, { ...liker, reaction: "like" });
  }
  return Array.from(effective.values());
}

export function countEffectiveReactions(reactors: DurablePostReactor[]): Record<DurableReaction, number> {
  const counts: Record<DurableReaction, number> = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0, seen: 0 };
  for (const reactor of reactors) counts[reactor.reaction] += 1;
  return counts;
}

export function totalEffectiveReactions(reactors: DurablePostReactor[]): number {
  return reactors.length;
}
