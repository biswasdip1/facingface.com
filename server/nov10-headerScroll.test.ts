import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const read = (file: string) => readFileSync(new URL(`../client/src/${file}`, import.meta.url), "utf8");

describe("November header and native WebView scrolling guards", () => {
  it("does not use a horizontally clipped primary header strip", () => {
    const code = read("components/NavBar.tsx");
    expect(code).toContain('aria-label="Main navigation"');
    expect(code).not.toContain('min-w-0 overflow-x-auto scrollbar-none');
    expect(code).toContain('!["Scheduled", "Trending"].includes(label)');
    expect(code).toContain('aria-label="More navigation"');
  });
  it("keeps overflow routes and whole labels accessible in narrow desktop layouts", () => {
    const css = read("components/header-navigation.css");
    for (const route of ["/scheduled", "/trending", "/groups", "/reels", "/notifications", "/calls", "/friends", "/saved"])
      expect(css).toContain(`.ff-header-overflow-link[data-header-route="${route}"]`);
    expect(read("components/NavBar.tsx")).toContain('mt-0.5 whitespace-nowrap');
  });
  it("adds only a navigation shortcut for deletion, never a destructive menu action", () => {
    const code = read("components/NavBar.tsx");
    expect(code).toContain('href="/security#delete-account"');
    expect(code).toContain('Delete my account');
    expect(code).not.toContain('auth.deleteAccount');
  });
  it("removes touch listeners entirely for disabled/native custom pull-to-refresh", () => {
    const code = read("hooks/usePullToRefresh.ts");
    const effect = code.indexOf('useEffect(() => {');
    const add = code.indexOf('document.addEventListener("touchstart"');
    const guard = code.slice(effect, add);
    expect(guard).toContain('if (disabled)');
    expect(guard).toContain('return;');
    expect(code).toContain('[disabled, handleTouchStart, handleTouchMove, handleTouchEnd]');
    expect(read("pages/Feed.tsx")).toContain('disabled: isNativeApp()');
  });
  it("coalesces load-more measurements and guards against duplicate requests", () => {
    const code = read("pages/Feed.tsx");
    expect(code).toContain('window.requestAnimationFrame(measureScroll)');
    expect(code).toContain('window.cancelAnimationFrame(frame)');
    expect(code).toContain('requested = true;');
    expect(code).toContain('window.addEventListener("scroll", handleScroll, { passive: true })');
  });
  it("removes full-size blurred placeholders after loading and decodes the real image asynchronously", () => {
    const code = read("components/PostCard.tsx");
    expect(code).toContain('{!errored && !loaded && (');
    expect(code).toContain('decoding="async"');
    expect(code).toContain('src={src}');
  });
});
