import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});

// ─── Email/Password Auth Tests ────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getUserByEmail: vi.fn(),
    createEmailUser: vi.fn(),
    setVerificationToken: vi.fn(),
    getUserByVerificationToken: vi.fn(),
    markEmailVerified: vi.fn(),
    getTotpSecret: vi.fn().mockResolvedValue(null),
    createActiveSession: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("./email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

import { getUserByEmail, createEmailUser } from "./db";

describe("auth.register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new user and returns needsVerification=true (no session cookie yet)", async () => {
    (getUserByEmail as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(undefined) // first call: check existing
      .mockResolvedValueOnce({ id: 42, openId: "email:alice@example.com", name: "Alice", email: "alice@example.com", passwordHash: "hash", emailVerified: false }); // second call: fetch new user
    (createEmailUser as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const mockRes = { cookie: vi.fn(), clearCookie: vi.fn() };
    const mockReq = { headers: {}, protocol: "https", hostname: "localhost" };
    const caller = appRouter.createCaller({ req: mockReq as any, res: mockRes as any, user: null });

    const result = await caller.auth.register({ name: "Alice", email: "alice@example.com", password: "secret123" });
    expect(result.success).toBe(true);
    expect((result as { needsVerification?: boolean }).needsVerification).toBe(true);
    // No session cookie should be set until email is verified
    expect(mockRes.cookie).not.toHaveBeenCalled();
    expect(createEmailUser).toHaveBeenCalledOnce();
  });

  it("throws CONFLICT if email already exists", async () => {
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, email: "alice@example.com", passwordHash: "hash" });

    const mockRes = { cookie: vi.fn(), clearCookie: vi.fn() };
    const mockReq = { headers: {}, protocol: "https", hostname: "localhost" };
    const caller = appRouter.createCaller({ req: mockReq as any, res: mockRes as any, user: null });

    await expect(caller.auth.register({ name: "Alice", email: "alice@example.com", password: "secret123" }))
      .rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("auth.emailLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs in with correct credentials and sets a session cookie", async () => {
    const hash = await bcrypt.hash("secret123", 10);
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1, openId: "email:alice@example.com", name: "Alice", email: "alice@example.com", passwordHash: hash, emailVerified: true,
    });

    const mockRes = { cookie: vi.fn(), clearCookie: vi.fn() };
    const mockReq = { headers: {}, protocol: "https", hostname: "localhost" };
    const caller = appRouter.createCaller({ req: mockReq as any, res: mockRes as any, user: null });

    const result = await caller.auth.emailLogin({ email: "alice@example.com", password: "secret123" });
    expect(result.success).toBe(true);
    expect(mockRes.cookie).toHaveBeenCalledOnce();
  });

  it("throws UNAUTHORIZED for wrong password", async () => {
    const hash = await bcrypt.hash("secret123", 10);
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1, openId: "email:alice@example.com", name: "Alice", email: "alice@example.com", passwordHash: hash, emailVerified: true,
    });

    const mockRes = { cookie: vi.fn(), clearCookie: vi.fn() };
    const mockReq = { headers: {}, protocol: "https", hostname: "localhost" };
    const caller = appRouter.createCaller({ req: mockReq as any, res: mockRes as any, user: null });

    await expect(caller.auth.emailLogin({ email: "alice@example.com", password: "wrongpass" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
