import Stripe from "stripe";

const stripeSecretKey = (process.env.STRIPE_SECRET_KEY ?? "").trim();

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set. Add your Stripe secret key, for example sk_live_..., in the server environment.");
}

if (stripeSecretKey.startsWith("pk_")) {
  throw new Error("STRIPE_SECRET_KEY contains a publishable key. Stripe Checkout session creation must use a server secret key that starts with sk_live_ or sk_test_.");
}

if (!/^sk_(test|live)_/.test(stripeSecretKey)) {
  throw new Error("STRIPE_SECRET_KEY must be a valid Stripe secret API key that starts with sk_live_ or sk_test_. Do not change a pk_live_ key into sk_live_.");
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-04-22.dahlia",
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
