import {
  FEED_INTERESTS,
  type FeedInterestId,
  type RecommendationReason,
} from "../shared/recommendations";

export type RankingPost = {
  id: number;
  authorId: number;
  text: string | null;
  linkTitle?: string | null;
  linkDescription?: string | null;
  createdAt: Date | string;
  resharedFromId?: number | null;
};

export type RankingContext = {
  interests: FeedInterestId[];
  followedAuthorIds: number[];
  communityTexts: string[];
  activityPosts: RankingPost[];
  hiddenPostIds: number[];
  now: Date;
};

const MAX_TEXT_LENGTH = 8_192;
const MAX_COMMUNITIES = 100;
const MAX_ACTIVITY_POSTS = 200;
const HALF_LIFE_MS = 72 * 60 * 60 * 1_000;

/** Catalog-order matches; English whole tokens, Nepali substrings, bounded work. */
export function detectInterests(text: string): FeedInterestId[] {
  const normalized = text
    .slice(0, MAX_TEXT_LENGTH)
    .normalize("NFKC")
    .toLowerCase();
  const tokens = new Set(
    normalized.match(new RegExp("[\\p{L}\\p{M}\\p{N}_]+", "gu")) ?? []
  );
  return FEED_INTERESTS.filter(interest =>
    interest.keywords.some(keyword =>
      /^[a-z]+$/.test(keyword)
        ? tokens.has(keyword)
        : normalized.includes(keyword)
    )
  ).map(interest => interest.id);
}

function postInterests(post: RankingPost): Set<FeedInterestId> {
  return new Set(
    [post.text, post.linkTitle, post.linkDescription].flatMap(text =>
      text ? detectInterests(text) : []
    )
  );
}

function overlaps(a: Set<FeedInterestId>, b: Set<FeedInterestId>): boolean {
  return Array.from(a).some(interest => b.has(interest));
}

/** Invalid timestamps have no recency; future timestamps get no extra advantage. */
function effectiveTime(value: Date | string, now: number): number {
  const time =
    value instanceof Date
      ? value.getTime()
      : typeof value === "string" && value.length <= 128
        ? Date.parse(value)
        : NaN;
  return Number.isFinite(time) ? Math.min(time, now) : -Infinity;
}

export function rankRecommendedPosts<T extends RankingPost>(
  posts: T[],
  context: RankingContext
): Array<{ post: T; reason: RecommendationReason }> {
  // These are the ONLY learned inputs. The caller authorizes public community
  // texts and activity (and supplies neither unless learning is opted into).
  // Binary topic sets prevent repetition, extra keywords, or activity spam from
  // accumulating weight. Both learned boosts together are capped at 30 points.
  const community = new Set<FeedInterestId>();
  for (const text of context.communityTexts.slice(0, MAX_COMMUNITIES)) {
    for (const interest of detectInterests(text)) community.add(interest);
  }
  const activity = new Set<FeedInterestId>();
  const seenActivity = new Set<number>();
  for (const post of context.activityPosts.slice(0, MAX_ACTIVITY_POSTS)) {
    if (seenActivity.has(post.id)) continue;
    seenActivity.add(post.id);
    for (const interest of Array.from(postInterests(post)))
      activity.add(interest);
  }

  const interests = new Set(context.interests);
  const followed = new Set(context.followedAuthorIds);
  const hidden = new Set(context.hiddenPostIds);
  const seen = new Set<number>();
  const nowValue = context.now.getTime();
  // Avoid a wall-clock dependency even if the caller supplies an invalid now.
  const now = Number.isFinite(nowValue) ? nowValue : 0;
  const scored = posts
    .filter(post => {
      if (hidden.has(post.id) || seen.has(post.id)) return false;
      seen.add(post.id); // First occurrence wins without modifying either input.
      return true;
    })
    .map(post => {
      const topics = postInterests(post);
      const time = effectiveTime(post.createdAt, now);
      const recency =
        time === -Infinity ? 0 : 20 * 2 ** (-(now - time) / HALF_LIFE_MS);
      // Fixed, auditable weights: explicit > following > community > activity.
      // Reasons describe the strongest positive affinity, not the recency base.
      const signals: Array<[RecommendationReason, number]> = [
        ["interest", overlaps(topics, interests) ? 80 : 0],
        ["following", followed.has(post.authorId) ? 30 : 0],
        ["community", overlaps(topics, community) ? 18 : 0],
        ["activity", overlaps(topics, activity) ? 12 : 0],
      ];
      return {
        post,
        time,
        score: recency + signals.reduce((sum, [, weight]) => sum + weight, 0),
        reason: signals.find(([, weight]) => weight > 0)?.[0] ?? "recent",
      };
    });

  // Newest effective time, then highest ID: never depend on input order for ties.
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      (b.time > a.time ? 1 : b.time < a.time ? -1 : b.post.id - a.post.id)
  );

  const result: Array<{ post: T; reason: RecommendationReason }> = [];
  while (scored.length) {
    const last = result[result.length - 1]?.post;
    const previous = result[result.length - 2]?.post;
    let index = 0;
    if (
      last &&
      previous &&
      last.authorId === previous.authorId &&
      scored[0].post.authorId === last.authorId
    ) {
      const alternative = scored.findIndex(
        item => item.post.authorId !== last.authorId
      );
      if (alternative !== -1) index = alternative;
    }
    const [{ post, reason }] = scored.splice(index, 1);
    result.push({ post, reason }); // Diversity reorders; it never discards a post.
  }
  return result;
}
