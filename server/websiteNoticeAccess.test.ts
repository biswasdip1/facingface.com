import { describe, expect, it } from "vitest";
import {
  getWebsiteNoticeDismissalKey,
  hasWebsiteNoticeContent,
  isManagedWebsiteNoticeImageUrl,
  isSupportedWebsiteNoticeVideoUrl,
} from "./websiteNoticeAccess";

describe("Website Notice access policy", () => {
  it("allows only FacingFace-managed notice image paths", () => {
    expect(isManagedWebsiteNoticeImageUrl("/media/notices/welcome.jpg")).toBe(true);
    expect(isManagedWebsiteNoticeImageUrl("/api/files/public-notices/welcome.jpg")).toBe(true);
    expect(isManagedWebsiteNoticeImageUrl("/manus-storage/notices/welcome.jpg")).toBe(true);
    expect(isManagedWebsiteNoticeImageUrl("https://example.com/banner.jpg")).toBe(false);
    expect(isManagedWebsiteNoticeImageUrl("/media/../private.jpg")).toBe(false);
  });

  it("permits supported HTTPS YouTube and Vimeo links only", () => {
    expect(isSupportedWebsiteNoticeVideoUrl("https://www.youtube.com/watch?v=abc123")).toBe(true);
    expect(isSupportedWebsiteNoticeVideoUrl("https://youtu.be/abc123")).toBe(true);
    expect(isSupportedWebsiteNoticeVideoUrl("https://vimeo.com/123456789")).toBe(true);
    expect(isSupportedWebsiteNoticeVideoUrl("http://youtube.com/watch?v=abc123")).toBe(false);
    expect(isSupportedWebsiteNoticeVideoUrl("https://example.com/watch?v=abc123")).toBe(false);
  });

  it("uses separate versioned dismissal keys before and after login", () => {
    expect(getWebsiteNoticeDismissalKey(5, "visitor")).toBe("facingface.website-notice.visitor.v5");
    expect(getWebsiteNoticeDismissalKey(5, "member", 42)).toBe("facingface.website-notice.member-42.v5");
    expect(getWebsiteNoticeDismissalKey(6, "member", 42)).not.toBe(getWebsiteNoticeDismissalKey(5, "member", 42));
  });

  it("requires both a title and message before publishing", () => {
    expect(hasWebsiteNoticeContent("Important update", "Please read this notice.")).toBe(true);
    expect(hasWebsiteNoticeContent("", "Message")).toBe(false);
    expect(hasWebsiteNoticeContent("Title", "   ")).toBe(false);
  });
});
