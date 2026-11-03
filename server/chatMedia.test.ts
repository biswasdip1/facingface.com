import { describe, expect, it } from "vitest";
import {
  safeChatUrl,
  splitChatText,
  chatVideoForUrl,
  chatAttachmentName,
} from "../client/src/lib/chatMedia";

describe("safe chat media", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,hello",
    "//evil.test/a",
    "https://user:pass@example.test/a",
    "https://example.test/\nthing",
    "file:///secret",
  ])("rejects unsafe URL %s", value => expect(safeChatUrl(value)).toBeNull());
  it("supports website and locally stored attachments", () => {
    expect(safeChatUrl("www.facingface.com")).toBe(
      "https://www.facingface.com/"
    );
    expect(safeChatUrl("/uploads/chat/photo.jpg", true)).toBe(
      "/uploads/chat/photo.jpg"
    );
    expect(safeChatUrl("/uploads/chat/photo.jpg")).toBeNull();
    expect(safeChatUrl("/\\evil.test/a", true)).toBeNull();
  });
  it("keeps all original text, trims punctuation and handles multiple links", () => {
    const text =
      "Hello (https://youtu.be/dQw4w9WgXcQ). See www.facingface.com, धन्यवाद।";
    const parts = splitChatText(text);
    expect(parts.map(p => p.text).join("")).toBe(text);
    expect(parts.filter(p => p.url).map(p => p.url)).toEqual([
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.facingface.com/",
    ]);
  });
  it("preserves balanced parenthesis and whitespace", () => {
    const text = "Check https://example.test/Title_(film)\n\nNext line";
    expect(splitChatText(text).find(p => p.url)?.text).toBe(
      "https://example.test/Title_(film)"
    );
    expect(
      splitChatText(text)
        .map(p => p.text)
        .join("")
    ).toBe(text);
  });
  it.each([
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://m.youtube.com/shorts/dQw4w9WgXcQ",
    "https://youtube.com/live/dQw4w9WgXcQ",
  ])("creates only trusted YouTube embed for %s", value =>
    expect(chatVideoForUrl(value)?.embedUrl).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
    )
  );
  it("sets vertical Shorts ratio and rejects impersonating hosts", () => {
    expect(
      chatVideoForUrl("https://youtube.com/shorts/dQw4w9WgXcQ")?.vertical
    ).toBe(true);
    expect(
      chatVideoForUrl("https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ")
    ).toBeNull();
    expect(chatVideoForUrl("https://youtube.com/watch?v=bad")).toBeNull();
  });
  it("recognizes Vimeo and query-bearing direct video URLs, not arbitrary sites", () => {
    expect(chatVideoForUrl("https://vimeo.com/12345678")?.embedUrl).toBe(
      "https://player.vimeo.com/video/12345678"
    );
    expect(
      chatVideoForUrl("https://cdn.example.test/video.mp4?token=demo")?.kind
    ).toBe("file");
    expect(chatVideoForUrl("https://facebook.com/some-video")).toBeNull();
  });
  it("provides safe useful filenames without directory traversal or control characters", () => {
    expect(
      chatAttachmentName("../../evil\nphoto.jpg", "https://example.test/p.jpg")
    ).not.toMatch(/[\/\n]/);
    expect(
      chatAttachmentName(
        null,
        "https://example.test/photos/cat%20photo.png?x=2"
      )
    ).toBe("cat photo.png");
    expect(chatAttachmentName("", "/", "image/jpeg")).toBe("chat-photo.jpg");
  });
});
