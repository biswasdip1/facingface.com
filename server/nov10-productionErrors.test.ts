import { afterEach, describe, expect, it, vi } from "vitest";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "./_core/trpc";
import type { TrpcContext } from "./_core/context";
import type { AddressInfo } from "node:net";
import { readFileSync } from "node:fs";

const app = router({
  broken: publicProcedure.query(() => { throw new Error('Failed query: SELECT passwordHash FROM users params: synthetic-private-email'); }),
  denied: publicProcedure.query(() => { throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." }); }),
});
afterEach(() => { vi.unstubAllEnvs(); });
async function request(path: string) {
  const server = createHTTPServer({ router: app, createContext: () => ({ user: null } as TrpcContext) });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const port = (server.address() as AddressInfo).port;
    return await (await fetch(`http://127.0.0.1:${port}/${path}`)).text();
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}
describe("production error disclosure and startup ordering", () => {
  it("does not transmit internal SQL or private parameters to the browser", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const body = await request("broken");
    expect(body).toContain("FacingFace encountered a server problem");
    expect(body).not.toContain("SELECT");
    expect(body).not.toContain("synthetic-private-email");
    expect(body).not.toContain("passwordHash");
  });
  it("preserves useful ordinary invalid-credential feedback", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(await request("denied")).toContain("Invalid email or password.");
  });
  it("requires schema readiness before seeds, routes and the media purge worker", () => {
    const source = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");
    const check = source.indexOf("await ensureAccountDeletionSchema(db)");
    expect(check).toBeGreaterThan(0);
    expect(check).toBeLessThan(source.indexOf("await runAllSeeds()"));
    expect(check).toBeLessThan(source.indexOf("const app = express()"));
    expect(check).toBeLessThan(source.indexOf("const stopPurgeWorker = startAccountMediaPurgeWorker()"));
    expect(source).toContain("process.exit(1)");
    expect(source).toContain("accountDeletionSchemaStatus");
  });
});
