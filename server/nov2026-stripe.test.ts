import { afterEach, describe, expect, it, vi } from "vitest";
import { stripe } from "./stripe";
import { registerStripeWebhook } from "./stripeWebhook";
const oldKey = process.env.STRIPE_SECRET_KEY;
const oldSecret = process.env.STRIPE_WEBHOOK_SECRET;
afterEach(() => { if (oldKey === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = oldKey; if (oldSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = oldSecret; });
describe("optional Stripe startup and safe webhook", () => {
  it("imports with no key but explicitly rejects payment operations", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(stripe).toBeDefined(); expect(() => stripe.checkout).toThrow("Payments are currently unavailable");
  });
  it("does not accept a forged unsigned webhook with missing secret", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    let handler: any;
    registerStripeWebhook({ post: (_path: string, _body: unknown, h: unknown) => { handler = h; } } as any);
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() };
    await handler({ headers: {}, body: Buffer.from('{"type":"checkout.session.completed"}') }, res);
    expect(res.status).toHaveBeenCalledWith(503);
  });
  it("rejects missing signature even with a signing secret", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "local-unit-test-value";
    let handler: any; registerStripeWebhook({ post: (_p: string, _b: unknown, h: unknown) => { handler = h; } } as any);
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() };
    await handler({ headers: {}, body: Buffer.from('{}') }, res); expect(res.status).toHaveBeenCalledWith(400);
  });
});
