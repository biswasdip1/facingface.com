import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildDataDeletionRequest, dataDeletionEmailHref, DATA_DELETION_TOPIC } from "../client/src/lib/dataDeletionRequest";
const read = (file: string) => readFileSync(new URL(`../client/src/${file}`, import.meta.url), "utf8");
describe("data-only deletion requests", () => {
  it("requires meaningful bounded details and keeps the account active", () => {
    expect(() => buildDataDeletionRequest("short")).toThrow();
    expect(() => buildDataDeletionRequest("x".repeat(3001))).toThrow();
    const request = buildDataDeletionRequest("  Please remove my old profile location.  ");
    expect(request).toContain("keeping my account active");
    expect(request).toContain("not an automatic deletion or subscription cancellation");
    expect(request).toContain("verify account ownership");
    expect(request.length).toBeLessThan(5000);
    expect(buildDataDeletionRequest("x".repeat(3000)).length).toBeLessThan(5000);
  });
  it("encodes email draft headers safely and bounds its body", () => {
    const link = dataDeletionEmailHref("photo link &subject=evil\nBCC: other@example.test");
    expect(link).toMatch(/^mailto:direct\.letter@gmail\.com\?subject=/);
    expect(link.split("&")).toHaveLength(2);
    const params = new URLSearchParams(link.slice(link.indexOf("?") + 1));
    expect(params.get("subject")).toBe(DATA_DELETION_TOPIC);
    expect(params.get("body")).toContain("BCC: other@example.test");
    expect(dataDeletionEmailHref("x".repeat(10000))).not.toContain("x".repeat(3001));
  });
  it("registers the public route before the Router authentication gate", () => {
    const app = read("App.tsx");
    const router = app.slice(app.indexOf("function Router()"));
    expect(router.indexOf('path === "/delete-data"')).toBeGreaterThan(0);
    expect(router.indexOf('path === "/delete-data"')).toBeLessThan(router.indexOf("<AuthGate>"));
  });
  it("queues only a support request and never invokes destructive operations", () => {
    const page = read("pages/DeleteDataInfo.tsx");
    expect(page).toContain("trpc.support.submit.useMutation");
    expect(page).not.toContain("trpc.auth.deleteAccount");
    expect(page).not.toContain("trpc.posts.delete");
    expect(page).not.toContain("localStorage");
    expect(page).toContain("you must send it");
    expect(page).toContain("no data was deleted by this submission");
    expect(page).toContain('role="alert"');
  });
  it("exposes both resources through Help, Privacy and the legal footer", () => {
    for(const file of ["pages/Privacy.tsx", "pages/Help.tsx", "components/LegalPage.tsx"])
      expect(read(file)).toContain("/delete-data");
    expect(read("pages/DeleteAccountInfo.tsx")).toContain("/delete-data");
  });
});
