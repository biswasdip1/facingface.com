import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const read = (file: string) => readFileSync(new URL(`../client/src/${file}`, import.meta.url), "utf8");
describe("Home-only shortcut layout", () => {
  it("adds a collapsed mobile menu with correctly linked expanded state", () => {
    const code = read("components/HomeMenuFrame.tsx");
    expect(code).toContain("useState(false)");
    expect(code).toContain('aria-expanded={open}');
    expect(code).toContain('aria-controls="ff-home-shortcuts-content"');
    expect(code).toContain('id="ff-home-shortcuts-content"');
    expect(code).toContain('aria-label="Community shortcuts"');
  });
  it("scopes balanced grid and theme styles to Home without changing shared containers", () => {
    const css = read("components/home-menu.css");
    expect(css).toContain(".ff-home-grid");
    expect(css).toContain('minmax(0, 1fr)');
    expect(css).toContain('var(--its-surface)');
    expect(css).toContain('var(--its-text-primary)');
    expect(css).not.toContain('.container');
    expect(css).not.toContain('geolocation');
    expect(read("pages/PageView.tsx")).not.toContain('HomeMenuFrame');
  });
  it("retains browser-only verification promotion and all existing shortcuts", () => {
    const code = read("pages/Feed.tsx");
    expect(code).toContain('!isFreeNativeEdition() && <Link href="/subscription"');
    for(const route of ["/profile", "/p", "/g", "/shop", "/birthdays", "/events"])
      expect(code).toContain(`href="${route}"`);
    expect(code).toContain('disabled: isNativeApp()');
    expect(code).toContain('<HomeMenuFrame>');
    expect(code).toContain('<RightNewsFeed />');
  });
});
