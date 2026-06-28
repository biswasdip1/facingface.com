import { describe, expect, it, vi } from "vitest";
import { fetchLinkPreview, extractFirstUrl } from "./linkPreview";

// ─── extractFirstUrl ──────────────────────────────────────────────────────────

describe("extractFirstUrl", () => {
  it("extracts a plain https URL", () => {
    expect(extractFirstUrl("Check this out https://example.com/page")).toBe(
      "https://example.com/page"
    );
  });

  it("extracts a URL at the start of text", () => {
    expect(extractFirstUrl("https://nepalisamachar.com/?p=19671 is a great article")).toBe(
      "https://nepalisamachar.com/?p=19671"
    );
  });

  it("extracts the first URL when multiple are present", () => {
    expect(
      extractFirstUrl("Visit https://first.com and also https://second.com")
    ).toBe("https://first.com");
  });

  it("returns null when no URL is present", () => {
    expect(extractFirstUrl("Just a plain text post with no links")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractFirstUrl("")).toBeNull();
  });

  it("handles URLs with query strings and fragments", () => {
    expect(
      extractFirstUrl("See https://example.com/path?q=hello&page=1#section for details")
    ).toBe("https://example.com/path?q=hello&page=1#section");
  });
});

// ─── fetchLinkPreview ─────────────────────────────────────────────────────────

describe("fetchLinkPreview", () => {
  it("returns null for an unreachable URL", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("fetch failed"));

    const result = await fetchLinkPreview("http://192.0.2.1/nonexistent");
    expect(result).toBeNull();

    globalThis.fetch = originalFetch;
  });

  it("returns null for a non-HTML content type URL", async () => {
    // Mock fetch to return a JSON response
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      headers: { get: () => "application/json" },
      text: async () => "{}",
    } as unknown as Response);

    const result = await fetchLinkPreview("https://api.example.com/data.json");
    expect(result).toBeNull();

    globalThis.fetch = originalFetch;
  });

  it("parses Open Graph tags from HTML", async () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Test Article Title" />
          <meta property="og:description" content="A great article about testing." />
          <meta property="og:image" content="https://example.com/image.jpg" />
          <meta property="og:site_name" content="Example News" />
        </head>
        <body><p>Content</p></body>
      </html>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      headers: { get: () => "text/html; charset=utf-8" },
      text: async () => html,
    } as unknown as Response);

    const result = await fetchLinkPreview("https://example.com/article");
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Test Article Title");
    expect(result!.description).toBe("A great article about testing.");
    expect(result!.image).toBe("https://example.com/image.jpg");
    expect(result!.siteName).toBe("Example News");

    globalThis.fetch = originalFetch;
  });

  it("falls back to <title> tag when og:title is missing", async () => {
    const html = `
      <html>
        <head><title>Fallback Title</title></head>
        <body></body>
      </html>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      headers: { get: () => "text/html" },
      text: async () => html,
    } as unknown as Response);

    const result = await fetchLinkPreview("https://example.com/page");
    expect(result!.title).toBe("Fallback Title");

    globalThis.fetch = originalFetch;
  });

  it("resolves relative image URLs to absolute", async () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="/images/hero.jpg" />
        </head>
        <body></body>
      </html>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      headers: { get: () => "text/html" },
      text: async () => html,
    } as unknown as Response);

    const result = await fetchLinkPreview("https://example.com/article");
    expect(result!.image).toBe("https://example.com/images/hero.jpg");

    globalThis.fetch = originalFetch;
  });
});
