import { describe, expect, it } from "vitest";
import { countEffectiveReactions, mergePostReactors, totalEffectiveReactions } from "./reactionConsistency";

describe("reaction consistency", () => {
  it("counts fifteen different members as fifteen reactions", () => {
    const enhanced = Array.from({ length: 15 }, (_, index) => ({
      userId: index + 1,
      name: `Member ${index + 1}`,
      avatar: null,
      reaction: "like" as const,
    }));
    const reactors = mergePostReactors(enhanced, []);

    expect(totalEffectiveReactions(reactors)).toBe(15);
    expect(countEffectiveReactions(reactors).like).toBe(15);
  });

  it("does not double-count a member in both typed reactions and legacy Likes", () => {
    const reactors = mergePostReactors(
      [{ userId: 7, name: "Asha", avatar: null, reaction: "love" }],
      [
        { userId: 7, name: "Asha", avatar: null },
        { userId: 8, name: "Bilal", avatar: null },
      ],
    );

    expect(totalEffectiveReactions(reactors)).toBe(2);
    expect(countEffectiveReactions(reactors)).toMatchObject({ love: 1, like: 1 });
  });

  it("keeps the newest typed reaction supplied first for a duplicated legacy row", () => {
    const reactors = mergePostReactors(
      [
        { userId: 3, name: "Chen", avatar: null, reaction: "wow" },
        { userId: 3, name: "Chen", avatar: null, reaction: "like" },
      ],
      [],
    );

    expect(reactors).toEqual([{ userId: 3, name: "Chen", avatar: null, reaction: "wow" }]);
  });
});
