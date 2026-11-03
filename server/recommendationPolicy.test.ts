import { describe, expect, it } from "vitest";
import {
  detectInterests,
  rankRecommendedPosts,
  type RankingContext,
  type RankingPost,
} from "./recommendationPolicy";

const NOW = "2026-11-02T12:00:00.000Z";
const post = (id: number, extra: Partial<RankingPost> = {}): RankingPost => ({
  id,
  authorId: id,
  text: null,
  createdAt: NOW,
  ...extra,
});
const context = (extra: Partial<RankingContext> = {}): RankingContext => ({
  interests: [],
  followedAuthorIds: [],
  communityTexts: [],
  activityPosts: [],
  hiddenPostIds: [],
  now: new Date(NOW),
  ...extra,
});
const ids = (posts: RankingPost[], ctx = context()) =>
  rankRecommendedPosts(posts, ctx).map(item => item.post.id);

// No database, analytics, network, clock mocking, or language-model dependencies.
describe("detectInterests", () => {
  it("matches English case-insensitively at token boundaries, not inside words", () => {
    expect(detectInterests("party artwork musical technologyish schoolbook"))
      .toEqual([]);
    expect(detectInterests("ART! (Music), CRICKET; coding."))
      .toEqual(["sports", "music", "arts", "technology"]);
    expect(detectInterests("art2 x_art arté" )).toEqual([]);
  });

  it("matches Nepali substrings, including inflections", () => {
    expect(detectInterests("फुटबलको खेलमा संगीत र साहित्यको चर्चा"))
      .toEqual(["sports", "music", "arts"]);
  });

  it("deduplicates topics and returns stable catalog order", () => {
    expect(detectInterests("coding software art painting ART coding"))
      .toEqual(["arts", "technology"]);
    expect(detectInterests("")).toEqual([]);
  });

  it("bounds long-text processing", () => {
    expect(detectInterests(" ".repeat(8_192) + "art")).toEqual([]);
    expect(detectInterests("art " + "x".repeat(100_000))).toEqual(["arts"]);
  });
});

describe("rankRecommendedPosts", () => {
  it("ranks an explicit interest above same-age unrelated content", () => {
    const ranked = rankRecommendedPosts([
      post(9), post(1, { text: "Cricket practice" }),
    ], context({ interests: ["sports"] }));
    expect(ranked.map(item => item.post.id)).toEqual([1, 9]);
    expect(ranked[0].reason).toBe("interest");
  });

  it("uses link titles and descriptions even when the post has no text", () => {
    const ranked = rankRecommendedPosts([
      post(9), post(1, { linkTitle: "कविता", linkDescription: "poetry" }),
    ], context({ interests: ["arts"] }));
    expect(ranked[0].post.id).toBe(1);
    expect(ranked[0].reason).toBe("interest");
  });

  it("gives followed authors a moderate boost without requiring text", () => {
    const ranked = rankRecommendedPosts([post(9), post(1)],
      context({ followedAuthorIds: [1, 1] }));
    expect(ranked[0]).toEqual({ post: post(1), reason: "following" });
  });

  it("learns topic affinity from supplied public community category/name text", () => {
    const ranked = rankRecommendedPosts([
      post(9), post(1, { text: "A new hiking route" }),
    ], context({ communityTexts: ["Travel — Nepal Trekking Group"] }));
    expect(ranked[0].post.id).toBe(1);
    expect(ranked[0].reason).toBe("community");
  });

  it("learns topic affinity from supplied activity posts", () => {
    const ranked = rankRecommendedPosts([
      post(9), post(1, { text: "A new recipe" }),
    ], context({ activityPosts: [post(100, { linkDescription: "cooking" })] }));
    expect(ranked[0].post.id).toBe(1);
    expect(ranked[0].reason).toBe("activity");
  });

  it("does not infer affinities from candidate posts or followed authors alone", () => {
    const posts = [
      post(1, { authorId: 10, text: "software" }),
      post(2, { text: "software" }), post(3),
    ];
    const ranked = rankRecommendedPosts(posts, context({ followedAuthorIds: [10] }));
    expect(ranked.map(item => item.post.id)).toEqual([1, 3, 2]);
    expect(ranked.map(item => item.reason)).toEqual(["following", "recent", "recent"]);
    expect(ids(posts)).toEqual([3, 2, 1]);
  });

  it("caps learned boosts so repeated activity cannot dominate explicit interests", () => {
    const posts = [post(1, { text: "poetry" }), post(9, { text: "software" })];
    const signals = {
      interests: ["arts"] as RankingContext["interests"],
      communityTexts: ["technology"],
      activityPosts: [post(100, { text: "software" })],
    };
    const baseline = rankRecommendedPosts(posts, context(signals));
    const repeated = rankRecommendedPosts(posts, context({
      ...signals,
      communityTexts: Array(100).fill("technology technology"),
      activityPosts: Array.from({ length: 200 }, (_, i) =>
        post(100 + i, { text: "software software computer" })),
    }));
    expect(repeated).toEqual(baseline);
    expect(repeated[0].post.id).toBe(1);
    expect(repeated[0].reason).toBe("interest");
  });

  it("does not count duplicate activity IDs as distinct signals", () => {
    const ranked = rankRecommendedPosts([post(1, { text: "software" }), post(9)],
      context({ activityPosts: [
        post(100, { text: "poetry" }), post(100, { text: "software" }),
      ] }));
    expect(ranked.map(item => item.reason)).toEqual(["recent", "recent"]);
    expect(ranked[0].post.id).toBe(9);
  });

  it("bounds the number of community and activity signals processed", () => {
    const ranked = rankRecommendedPosts([post(1, { text: "software" }), post(9)],
      context({
        communityTexts: [...Array(100).fill(""), "software"],
        activityPosts: [
          ...Array.from({ length: 200 }, (_, i) => post(100 + i)),
          post(999, { text: "software" }),
        ],
      }));
    expect(ranked.map(item => item.reason)).toEqual(["recent", "recent"]);
    expect(ranked[0].post.id).toBe(9);
  });

  it("reports the strongest actual positive signal", () => {
    const candidate = post(1, { text: "music" });
    const all = context({
      interests: ["music"], followedAuthorIds: [1], communityTexts: ["music"],
      activityPosts: [post(100, { text: "music" })],
    });
    expect(rankRecommendedPosts([candidate], all)[0].reason).toBe("interest");
    expect(rankRecommendedPosts([candidate], { ...all, interests: [] })[0].reason)
      .toBe("following");
    expect(rankRecommendedPosts([candidate], {
      ...all, interests: [], followedAuthorIds: [],
    })[0].reason).toBe("community");
  });

  it("excludes hidden posts regardless of positive signals and deduplicates IDs", () => {
    const first = post(1, { text: "poetry" });
    const ranked = rankRecommendedPosts([
      post(2, { text: "poetry" }), first, post(1, { text: "duplicate" }),
    ], context({ interests: ["arts"], hiddenPostIds: [2] }));
    expect(ranked).toHaveLength(1);
    expect(ranked[0].post).toBe(first);
    expect(rankRecommendedPosts([first], context({ hiddenPostIds: [1] }))).toEqual([]);
  });

  it("breaks equal scores deterministically by effective time then descending ID", () => {
    const posts = [post(1), post(3), post(2)];
    expect(ids(posts)).toEqual([3, 2, 1]);
    expect(ids([...posts].reverse())).toEqual([3, 2, 1]);
    // Both recency scores underflow to zero, so the time tie-break is exercised.
    expect(ids([
      post(9, { createdAt: "1900-01-01" }), post(1, { createdAt: "1901-01-01" }),
    ])).toEqual([1, 9]);
  });

  it("avoids a third consecutive author when an alternative is available", () => {
    const posts = [1, 2, 3, 4].map(id => post(id, { authorId: 10 }));
    posts.push(post(5, { authorId: 20 }));
    const ranked = rankRecommendedPosts(posts, context({ followedAuthorIds: [10] }));
    expect(ranked.map(item => item.post.id)).toEqual([4, 3, 5, 2, 1]);
    expect(new Set(ranked.map(item => item.post.id)).size).toBe(5);
  });

  it("retains all posts when only one author remains", () => {
    const posts = [1, 2, 3, 4].map(id => post(id, { authorId: 10 }));
    expect(ids(posts)).toEqual([4, 3, 2, 1]);
  });

  it("uses neutral recency for cold starts without preferring a topic", () => {
    const ranked = rankRecommendedPosts([
      post(9, { text: "music", createdAt: "2026-11-01T12:00:00Z" }),
      post(1, { text: null }),
    ], context());
    expect(ranked.map(item => item.post.id)).toEqual([1, 9]);
    expect(ranked.every(item => item.reason === "recent")).toBe(true);
    expect(rankRecommendedPosts([], context())).toEqual([]);
  });

  it("does not mutate arrays, posts, context, or dates and preserves generic fields", () => {
    const candidate = { ...post(1, { text: "music", createdAt: new Date(NOW) }), extra: "keep" };
    const posts = [post(2), candidate];
    const ctx = context({
      interests: ["music"], followedAuthorIds: [1], communityTexts: ["music"],
      activityPosts: [post(100, { text: "music" })], hiddenPostIds: [99],
    });
    const before = structuredClone({ posts, ctx });
    for (const item of [...posts, ...ctx.activityPosts]) Object.freeze(item);
    for (const value of Object.values(ctx)) if (Array.isArray(value)) Object.freeze(value);
    Object.freeze(posts);
    Object.freeze(ctx);
    const ranked = rankRecommendedPosts(posts, ctx);
    expect({ posts, ctx }).toEqual(before);
    expect(ranked[0].post).toBe(candidate);
    expect((ranked[0].post as typeof candidate).extra).toBe("keep");
  });

  it("places invalid timestamps last for neutral posts without producing unstable ties", () => {
    const posts = [
      post(9, { createdAt: "not-a-date" }), post(8, { createdAt: new Date(NaN) }),
      post(1), post(2, { createdAt: "2026-11-01T12:00:00Z" }),
    ];
    expect(ids(posts)).toEqual([1, 2, 9, 8]);
    expect(ids([...posts].reverse())).toEqual([1, 2, 9, 8]);
    expect(ids([post(1)], context({ now: new Date(NaN) }))).toEqual([1]);
  });

  it("clamps future timestamps to now for scoring and tie-breaking", () => {
    expect(ids([
      post(1, { createdAt: "2099-01-01T00:00:00Z" }), post(2),
    ])).toEqual([2, 1]);
  });
});
