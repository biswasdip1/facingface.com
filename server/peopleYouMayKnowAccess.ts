export type SuggestionCandidate = {
  id: number;
  name: string | null;
  avatar: string | null;
  isVerified?: boolean;
};

/** Excludes globally removed candidates while preserving normal Find/Search access. */
export function filterPeopleYouMayKnowCandidates<T extends SuggestionCandidate>(
  candidates: T[],
  excludedUserIds: Iterable<number>,
): T[] {
  const excluded = new Set(excludedUserIds);
  return candidates.filter((candidate) => !excluded.has(candidate.id));
}
