import Stripe from "stripe";

import { TRPCError } from "@trpc/server";
let stripeClient: Stripe | undefined;
function configuredStripe(): Stripe {
  const key = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!/^sk_(test|live)_/.test(key)) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Payments are currently unavailable. Stripe is not configured." });
  }
  return stripeClient ??= new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}
/** Payment configuration is optional at startup, never replaced with fake keys. */
export const stripe = new Proxy({} as Stripe, {
  get(_target, property) {
    const client = configuredStripe();
    const value = Reflect.get(client, property);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

// Blue Badge subscription product — price is created on first use if not set
export const BADGE_PRICE_MONTHLY_GBP = 200; // £2.00 in pence
export const BADGE_CURRENCY = "gbp";
export const BADGE_PRODUCT_NAME = "FacingFace Blue Badge";
export const BADGE_PRODUCT_DESCRIPTION = "Verified blue badge on your profile, posts, messages and comments.";

/** Get or create the recurring price for the blue badge subscription */
export async function getOrCreateBadgePrice(): Promise<string> {
  // Look for existing active price with our metadata at the correct amount
  const prices = await stripe.prices.list({ active: true, limit: 100 });
  const existing = prices.data.find(
    (p) =>
      p.metadata?.badge === "blue" &&
      p.recurring?.interval === "month" &&
      p.unit_amount === BADGE_PRICE_MONTHLY_GBP &&
      p.currency === BADGE_CURRENCY
  );
  if (existing) return existing.id;

  // Deactivate any stale blue badge prices at the wrong amount
  const stale = prices.data.filter(
    (p) => p.metadata?.badge === "blue" && p.recurring?.interval === "month"
  );
  for (const p of stale) {
    await stripe.prices.update(p.id, { active: false });
  }

  // Find or create the product
  const products = await stripe.products.list({ active: true, limit: 100 });
  let product = products.data.find((p) => p.metadata?.badge === "blue");
  if (!product) {
    product = await stripe.products.create({
      name: BADGE_PRODUCT_NAME,
      description: BADGE_PRODUCT_DESCRIPTION,
      metadata: { badge: "blue" },
    });
  }

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: BADGE_PRICE_MONTHLY_GBP,
    currency: BADGE_CURRENCY,
    recurring: { interval: "month" },
    metadata: { badge: "blue" },
  });

  return price.id;
}
