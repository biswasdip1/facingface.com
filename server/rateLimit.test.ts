import { describe, it, expect, beforeEach } from "vitest";
import { createRateLimiter, loginLimiter, registerLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  it("allows requests up to maxAttempts", () => {
    const limiter = createRateLimiter({ maxAttempts: 3, windowMs: 60_000 });
    expect(() => limiter.check("1.2.3.4")).not.toThrow();
    expect(() => limiter.check("1.2.3.4")).not.toThrow();
    expect(() => limiter.check("1.2.3.4")).not.toThrow();
  });

  it("throws TRPCError after exceeding maxAttempts", () => {
    const limiter = createRateLimiter({ maxAttempts: 2, windowMs: 60_000 });
    limiter.check("1.2.3.4");
    limiter.check("1.2.3.4");
    expect(() => limiter.check("1.2.3.4")).toThrow("Too many");
  });

  it("tracks different IPs independently", () => {
    const limiter = createRateLimiter({ maxAttempts: 1, windowMs: 60_000 });
    limiter.check("1.1.1.1");
    expect(() => limiter.check("1.1.1.1")).toThrow();
    // Different IP should still be allowed
    expect(() => limiter.check("2.2.2.2")).not.toThrow();
  });

  it("resets counter after calling reset()", () => {
    const limiter = createRateLimiter({ maxAttempts: 1, windowMs: 60_000 });
    limiter.check("1.2.3.4");
    expect(() => limiter.check("1.2.3.4")).toThrow();
    limiter.reset("1.2.3.4");
    expect(() => limiter.check("1.2.3.4")).not.toThrow();
  });

  it("resets counter after the time window expires", () => {
    const limiter = createRateLimiter({ maxAttempts: 1, windowMs: 1 }); // 1ms window
    limiter.check("1.2.3.4");
    // Wait for the window to expire
    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(() => limiter.check("1.2.3.4")).not.toThrow();
        resolve();
      }, 10);
    });
  });

  it("includes retry-after seconds in the error message", () => {
    const limiter = createRateLimiter({ maxAttempts: 1, windowMs: 60_000, action: "test requests" });
    limiter.check("1.2.3.4");
    try {
      limiter.check("1.2.3.4");
    } catch (err: unknown) {
      expect((err as Error).message).toMatch(/test requests/);
      expect((err as Error).message).toMatch(/seconds/);
    }
  });
});

describe("shared limiters", () => {
  beforeEach(() => {
    // Clear state between tests
    loginLimiter._store.clear();
    registerLimiter._store.clear();
  });

  it("loginLimiter allows up to 10 attempts per IP", () => {
    for (let i = 0; i < 10; i++) {
      expect(() => loginLimiter.check("5.5.5.5")).not.toThrow();
    }
    expect(() => loginLimiter.check("5.5.5.5")).toThrow("login attempts");
  });

  it("registerLimiter allows up to 5 attempts per IP", () => {
    for (let i = 0; i < 5; i++) {
      expect(() => registerLimiter.check("6.6.6.6")).not.toThrow();
    }
    expect(() => registerLimiter.check("6.6.6.6")).toThrow("registration attempts");
  });
});
