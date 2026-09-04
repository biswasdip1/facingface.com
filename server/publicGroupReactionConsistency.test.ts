import { describe, expect, it } from "vitest";
import { summarisePublicGroupReactions } from "./publicGroupReactionConsistency";

describe("Public Group reaction consistency", () => {
  it("counts one effective reaction per member and returns recent members in descending order", () => {
    const result = summarisePublicGroupReactions([
      { userId: 1, reaction: "like", createdAt: new Date("2026-09-04T10:00:00Z") },
      { userId: 2, reaction: "love", createdAt: new Date("2026-09-04T10:03:00Z") },
      { userId: 3, reaction: "haha", createdAt: new Date("2026-09-04T10:02:00Z") },
      { userId: 1, reaction: "love", createdAt: new Date("2026-09-04T10:05:00Z") },
    ], 1);

    expect(result.total).toBe(3);
    expect(result.counts).toEqual({ love: 2, haha: 1 });
    expect(result.myReaction).toBe("love");
    expect(result.recent.map((reaction) => reaction.userId)).toEqual([1, 2, 3]);
  });

  it("ignores invalid or obsolete reaction values", () => {
    const result = summarisePublicGroupReactions([
      { userId: 1, reaction: "like", createdAt: new Date("2026-09-04T10:00:00Z") },
      { userId: 2, reaction: "seen", createdAt: new Date("2026-09-04T10:01:00Z") },
    ]);
    expect(result.total).toBe(1);
    expect(result.counts).toEqual({ like: 1 });
  });
});
