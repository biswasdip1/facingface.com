import { describe, expect, it } from "vitest";
import { canonicalPublicGroupHandle, isUnsafePublicGroupHandle } from "./db";

describe("Public Group stability helpers", () => {
  it("marks URL-derived values as unsafe handles", () => {
    expect(isUnsafePublicGroupHandle("httpsyoutubecomramprasadbhurtel")).toBe(true);
    expect(isUnsafePublicGroupHandle("http-example")).toBe(true);
  });

  it("keeps ordinary public group handles valid", () => {
    expect(isUnsafePublicGroupHandle("hamro-nepal-hamro-awaj")).toBe(false);
    expect(isUnsafePublicGroupHandle("education-2026")).toBe(false);
  });

  it("uses a stable neutral canonical route for a legacy group", () => {
    expect(canonicalPublicGroupHandle(42)).toBe("group-42");
  });
});
