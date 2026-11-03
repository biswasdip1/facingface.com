import { describe, expect, it } from "vitest";
import { getPostFeeling, POST_FEELING_VALUES, POST_FEELINGS } from "../shared/postSocialMetadata";

describe("post social metadata", () => {
  it("uses a controlled, non-empty feeling and activity catalog", () => {
    expect(POST_FEELINGS.length).toBeGreaterThan(0);
    expect(POST_FEELING_VALUES).toContain("happy");
    expect(POST_FEELING_VALUES).toContain("travelling");
  });

  it("maps stored values to readable labels and rejects unknown values", () => {
    expect(getPostFeeling("happy")).toMatchObject({ emoji: "😊", label: "Happy" });
    expect(getPostFeeling("not-a-real-feeling")).toBeNull();
    expect(getPostFeeling(null)).toBeNull();
  });
});
