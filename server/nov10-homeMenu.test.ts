import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const read = (file: string) => readFileSync(new URL(`../client/src/${file}`, import.meta.url), "utf8");
describe("Home-only shortcut layout", () => {
  it("hides the entire shortcut card below the existing desktop breakpoint and retains desktop navigation", () => {
    const code = read("components/HomeMenuFrame.tsx");
    const css = read("components/home-menu.css");
    const desktopStart = css.indexOf("@media (min-width: 1024px)");
    expect(desktopStart).toBeGreaterThan(0);
    expect(css.slice(0, desktopStart)).toMatch(/\.ff-home-menu\s*\{[^}]*display:\s*none;/);
    expect(css.slice(desktopStart)).toMatch(/\.ff-home-menu\s*\{[^}]*display:\s*block;/);
    expect(css.slice(desktopStart)).toContain("grid-template-columns: 224px minmax(0, 1fr)");
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
