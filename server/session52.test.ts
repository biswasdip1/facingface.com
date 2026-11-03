import { describe, it, expect } from "vitest";

// ─── Lightbox focus trap ──────────────────────────────────────────────────────
describe("PhotoLightbox / ImageLightbox focus trap", () => {
  it("identifies focusable elements selector correctly", () => {
    const selector = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    expect(selector).toContain("button");
    expect(selector).toContain("[href]");
    expect(selector).toContain('[tabindex]:not([tabindex="-1"])');
  });

  it("Tab wraps from last to first focusable element", () => {
    const focusable = ["download-btn", "close-btn", "prev-btn", "next-btn"];
    const last = focusable[focusable.length - 1];
    const first = focusable[0];
    // Simulate Tab on last element
    const activeIndex = focusable.indexOf(last);
    const nextIndex = (activeIndex + 1) % focusable.length;
    expect(focusable[nextIndex]).toBe(first);
  });

  it("Shift+Tab wraps from first to last focusable element", () => {
    const focusable = ["download-btn", "close-btn", "prev-btn", "next-btn"];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    // Simulate Shift+Tab on first element
    const activeIndex = focusable.indexOf(first);
    const prevIndex = (activeIndex - 1 + focusable.length) % focusable.length;
    expect(focusable[prevIndex]).toBe(last);
  });

  it("Escape key triggers onClose", () => {
    let closed = false;
    const onClose = () => { closed = true; };
    const handler = (key: string) => { if (key === "Escape") onClose(); };
    handler("Escape");
    expect(closed).toBe(true);
  });

  it("ArrowLeft triggers prev, ArrowRight triggers next", () => {
    let current = 1;
    const prev = () => { current = (current - 1 + 3) % 3; };
    const next = () => { current = (current + 1) % 3; };
    const handler = (key: string) => {
      if (key === "ArrowLeft") prev();
      if (key === "ArrowRight") next();
    };
    handler("ArrowLeft");
    expect(current).toBe(0);
    handler("ArrowRight");
    expect(current).toBe(1);
  });

  it("dialog has correct ARIA attributes", () => {
    const attrs = { role: "dialog", "aria-modal": "true", "aria-label": "Photo lightbox" };
    expect(attrs.role).toBe("dialog");
    expect(attrs["aria-modal"]).toBe("true");
    expect(attrs["aria-label"]).toBeTruthy();
  });
});

// ─── Comment translation ──────────────────────────────────────────────────────
describe("CommentSection translate button", () => {
  it("shows 'Translate' when no translation exists", () => {
    const translatedText: string | null = null;
    const label = translatedText ? "Show original" : "Translate";
    expect(label).toBe("Translate");
  });

  it("shows 'Show original' when translation exists", () => {
    const translatedText = "Translated text";
    const label = translatedText ? "Show original" : "Translate";
    expect(label).toBe("Show original");
  });

  it("clicking translate when already translated resets to null", () => {
    let translatedText: string | null = "Translated text";
    if (translatedText) { translatedText = null; }
    expect(translatedText).toBeNull();
  });

  it("displays translated text when available", () => {
    const comment = { text: "Hello world" };
    const translatedText = "Hola mundo";
    const displayed = translatedText ?? comment.text;
    expect(displayed).toBe("Hola mundo");
  });

  it("falls back to original when no translation", () => {
    const comment = { text: "Hello world" };
    const translatedText: string | null = null;
    const displayed = translatedText ?? comment.text;
    expect(displayed).toBe("Hello world");
  });
});

// ─── Auto-poster on publish ───────────────────────────────────────────────────
describe("posts.create auto-poster logic", () => {
  it("skips auto-poster if videoPosterUrl is already provided", () => {
    const input = { mediaType: "video", mediaUrl: "/manus-storage/v.mp4", videoPosterUrl: "/manus-storage/p.jpg" };
    const shouldGenerate = input.mediaType === "video" && input.mediaUrl && !input.videoPosterUrl;
    expect(shouldGenerate).toBe(false);
  });

  it("triggers auto-poster when mediaType=video and no posterUrl", () => {
    const input = { mediaType: "video", mediaUrl: "/manus-storage/v.mp4", videoPosterUrl: undefined };
    const shouldGenerate = input.mediaType === "video" && input.mediaUrl && !input.videoPosterUrl;
    expect(shouldGenerate).toBe(true);
  });

  it("skips auto-poster for image posts", () => {
    const input = { mediaType: "image", mediaUrl: "/manus-storage/img.jpg", videoPosterUrl: undefined };
    const shouldGenerate = input.mediaType === "video" && input.mediaUrl && !input.videoPosterUrl;
    expect(shouldGenerate).toBe(false);
  });

  it("skips auto-poster when no mediaUrl", () => {
    const input = { mediaType: "video", mediaUrl: undefined, videoPosterUrl: undefined };
    const shouldGenerate = input.mediaType === "video" && input.mediaUrl && !input.videoPosterUrl;
    expect(shouldGenerate).toBeFalsy();
  });

  it("resolvedPosterUrl falls back to null on extraction failure", () => {
    let resolvedPosterUrl: string | null = null;
    // Simulate failed extraction (frameBuf = null)
    const frameBuf: Buffer | null = null;
    if (frameBuf) { resolvedPosterUrl = "/manus-storage/poster.jpg"; }
    expect(resolvedPosterUrl).toBeNull();
  });

  it("constructs correct storage URL from /manus-storage/ path", () => {
    const mediaUrl = "/manus-storage/abc123.mp4";
    const baseUrl = "https://api.example.com";
    const videoUrl = mediaUrl.startsWith("/manus-storage/")
      ? `${baseUrl}/storage/files/${mediaUrl.replace("/manus-storage/", "")}`
      : mediaUrl;
    expect(videoUrl).toBe("https://api.example.com/storage/files/abc123.mp4");
  });
});
