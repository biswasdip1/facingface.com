import { describe, expect, it } from "vitest";
import { canonicalPublicGroupHandle, isUnsafePublicGroupHandle, withPublicGroupYouTubeThumbnail } from "./db";

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

  it("adds a YouTube thumbnail for an older Group post with text-only metadata", () => {
    const post = {
      id: 77,
      linkUrl: "https://youtu.be/dQw4w9WgXcQ?si=example",
      linkImage: null,
    } as any;
    expect(withPublicGroupYouTubeThumbnail(post).linkImage).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });

  it("keeps an existing Group preview image unchanged", () => {
    const post = {
      id: 78,
      linkUrl: "https://youtu.be/dQw4w9WgXcQ",
      linkImage: "https://example.com/original-preview.jpg",
    } as any;
    expect(withPublicGroupYouTubeThumbnail(post).linkImage).toBe("https://example.com/original-preview.jpg");
  });
});
