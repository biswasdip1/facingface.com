import { describe, expect, it } from "vitest";
import { isFacingFaceEventBannerUrl, normaliseEventBannerUrl } from "./eventBannerAccess";

describe("Event banner access", () => {
  it("accepts current Render disk media URLs", () => {
    expect(isFacingFaceEventBannerUrl("/media/media/2610/1725480000000-banner.webp")).toBe(true);
    expect(normaliseEventBannerUrl("  /media/media/2610/event-banner.webp  ")).toBe("/media/media/2610/event-banner.webp");
  });

  it("retains compatibility with internal legacy media URLs", () => {
    expect(isFacingFaceEventBannerUrl("/manus-storage/media/2610/event-banner.webp")).toBe(true);
  });

  it("rejects external URLs and unsafe paths", () => {
    expect(isFacingFaceEventBannerUrl("https://example.test/banner.jpg")).toBe(false);
    expect(isFacingFaceEventBannerUrl("/media/../../private/banner.jpg")).toBe(false);
    expect(normaliseEventBannerUrl("https://example.test/banner.jpg")).toBeNull();
  });
});
