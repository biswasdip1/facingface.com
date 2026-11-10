import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => ({ getDb: state.getDb }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); state.getDb.mockReset(); });
describe("administrator seed safety", () => {
  it("does not touch the database when explicit seeding is disabled", async () => {
    vi.stubEnv("SEED_ADMIN_ENABLED", "false");
    const { seedSuperAdmin } = await import("./seed");
    await seedSuperAdmin(); expect(state.getDb).not.toHaveBeenCalled();
  });
  it("does not use built-in credentials when opt-in has no strong secret", async () => {
    vi.stubEnv("SEED_ADMIN_ENABLED", "true"); vi.stubEnv("SEED_ADMIN_EMAIL", ""); vi.stubEnv("SEED_ADMIN_PASSWORD", "");
    const { seedSuperAdmin } = await import("./seed");
    await seedSuperAdmin(); expect(state.getDb).not.toHaveBeenCalled();
  });
});
