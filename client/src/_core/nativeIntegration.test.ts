import { afterEach, describe, expect, it, vi } from "vitest";
import { isNativeApp, isFreeNativeEdition, parseNativeDraft } from "./nativeIntegration";

afterEach(() => vi.unstubAllGlobals());

describe("free mobile edition boundary", () => {
  it("does not disable billing for ordinary browser users", () => {
    vi.stubGlobal("window", {});
    expect(isNativeApp()).toBe(false);
    expect(isFreeNativeEdition()).toBe(false);
  });
  it("requires both native and free markers", () => {
    vi.stubGlobal("window", { __FACINGFACE_NATIVE__: true });
    expect(isFreeNativeEdition()).toBe(false);
    vi.stubGlobal("window", { __FACINGFACE_NATIVE__: true, __FACINGFACE_BILLING_MODE__: "free" });
    expect(isFreeNativeEdition()).toBe(true);
  });
});

describe("user-triggered native draft validation", () => {
  it("accepts bounded text and ordinary image data without HTML rendering", () => {
    expect(parseNativeDraft({ id: "draft-1", text: "<script>not HTML</script>" })?.text).toBe("<script>not HTML</script>");
    expect(parseNativeDraft({ id: "draft-2", text: "Photo", imageDataUrl: "data:image/jpeg;base64,YWJj" })?.id).toBe("draft-2");
  });
  it("rejects overlarge, invalid and executable image payloads", () => {
    expect(parseNativeDraft(null)).toBeNull();
    expect(parseNativeDraft({ id: "x", text: "x".repeat(6001) })).toBeNull();
    expect(parseNativeDraft({ id: "x", text: "x", imageDataUrl: "javascript:alert(1)" })).toBeNull();
    expect(parseNativeDraft({ id: "x", text: "x", imageDataUrl: "data:image/svg+xml;base64,YWJj" })).toBeNull();
    expect(parseNativeDraft({ id: "x", text: "x", imageDataUrl: "data:image/png;base64," + "A".repeat(4_200_000) })).toBeNull();
  });
});
