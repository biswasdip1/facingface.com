/**
 * Simple in-memory IP-based rate limiter.
 *
 * Usage:
 *   const limiter = createRateLimiter({ maxAttempts: 10, windowMs: 15 * 60 * 1000 });
 *   limiter.check(ip); // throws TRPCError if limit exceeded
 *   limiter.reset(ip); // call on successful auth to clear the counter
 */

import { TRPCError } from "@trpc/server";

interface RateLimiterOptions {
  /** Maximum number of attempts allowed within the window */
  maxAttempts: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Human-readable action name for error messages */
  action?: string;
  /**
   * Called exactly once (when count first exceeds maxAttempts) for a given key.
   * Use this to send a lockout notification email. Errors are swallowed so the
   * main flow is never blocked by a notification failure.
   */
  onLimitExceeded?: (key: string, retryAfterSec: number) => void;
}

interface Entry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(opts: RateLimiterOptions) {
  const store = new Map<string, Entry>();

  // Periodically clean up expired entries to prevent memory leaks
  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of Array.from(store.entries())) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  };
  // Run cleanup every 5 minutes
  const interval = setInterval(cleanup, 5 * 60 * 1000);
  // Allow Node to exit even if the interval is still running
  if (interval.unref) interval.unref();

  return {
    /**
     * Check whether the given key (typically an IP address) has exceeded the
     * rate limit. Throws a TRPCError with code TOO_MANY_REQUESTS if exceeded.
     */
    check(key: string): void {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || now >= entry.resetAt) {
        // First attempt in this window
        store.set(key, { count: 1, resetAt: now + opts.windowMs });
        return;
      }

      entry.count += 1;

      if (entry.count > opts.maxAttempts) {
        const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
        const action = opts.action ?? "requests";
        // Fire the callback exactly once (when count first exceeds the limit)
        if (entry.count === opts.maxAttempts + 1 && opts.onLimitExceeded) {
          try { opts.onLimitExceeded(key, retryAfterSec); } catch { /* non-blocking */ }
        }
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many ${action}. Please try again in ${retryAfterSec} seconds.`,
        });
      }
    },

    /**
     * Reset the counter for a key (e.g., after a successful login so that
     * legitimate users are not penalised after a few failed attempts).
     */
    reset(key: string): void {
      store.delete(key);
    },

    /** Expose the internal store for testing purposes only. */
    _store: store,
  };
}

// Shared limiters — instantiated once at module load so state persists across requests.
// The loginLimiter's onLimitExceeded callback is wired up lazily in routers.ts
// (after the user record is fetched) so we can include the user's email in the alert.
export const loginLimiter = createRateLimiter({
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
  action: "login attempts",
});

export const registerLimiter = createRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  action: "registration attempts",
});
