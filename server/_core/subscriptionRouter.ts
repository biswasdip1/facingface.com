import { router, protectedProcedure, publicProcedure } from "./trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { stripe, getOrCreateBadgePrice } from "../stripe";
import { getSubscriptionByUser, upsertSubscription, revokeSubscription, setUserVerified, getAllSubscriptions } from "../db";

export const SUBSCRIPTION_TIERS = {
  green: {
    name: "Green",
    price: 2,
    currency: "GBP",
    interval: "month",
    features: ["Verified badge", "Priority support"],
  },
  golden: {
    name: "Golden",
    price: 5,
    currency: "GBP",
    interval: "month",
    features: ["Verified badge", "Priority support", "Featured profile"],
  },
  diamond: {
    name: "Diamond",
    price: 10,
    currency: "GBP",
    interval: "one_time",
    features: ["Verified badge", "Priority support", "Featured profile", "Lifetime access"],
  },
};

export const enhancedSubscriptionRouter = router({
  // Get user's current subscription
  getMySubscription: protectedProcedure.query(async ({ ctx }) => {
    const sub = await getSubscriptionByUser(ctx.user.id);
    return {
      ...sub,
      tier: sub?.tier ?? null,
      isActive: sub?.status === "active",
    };
  }),

  // List all available tiers
  listTiers: publicProcedure.query(async () => {
    return Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => ({
      id: key,
      ...tier,
    }));
  }),

  // Create checkout session for a specific tier
  createCheckoutSession: protectedProcedure
    .input(z.object({ tier: z.enum(["green", "golden", "diamond"]), origin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const tierConfig = SUBSCRIPTION_TIERS[input.tier];
        if (!tierConfig) throw new Error("Invalid tier");

        const sessionConfig: any = {
          mode: input.tier === "diamond" ? "payment" : "subscription",
          payment_method_types: ["card"],
          customer_email: ctx.user.email ?? undefined,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            tier: input.tier,
            customer_email: ctx.user.email ?? "",
            customer_name: ctx.user.name ?? "",
          },
          allow_promotion_codes: true,
          success_url: `${input.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}&tier=${input.tier}`,
          cancel_url: `${input.origin}/subscription`,
        };

        // Create price or use existing
        let priceId: string;

        if (input.tier === "diamond") {
          // One-time payment
          const product = await stripe.products.create({
            name: `FacingFace ${tierConfig.name} Subscription`,
            description: tierConfig.features.join(", "),
          });

          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: tierConfig.price * 100, // Convert to pence
            currency: tierConfig.currency.toLowerCase(),
          });

          priceId = price.id;
        } else {
          // Monthly subscription
          const product = await stripe.products.create({
            name: `FacingFace ${tierConfig.name} Subscription`,
            description: tierConfig.features.join(", "),
          });

          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: tierConfig.price * 100, // Convert to pence
            currency: tierConfig.currency.toLowerCase(),
            recurring: {
              interval: "month",
              interval_count: 1,
            },
          });

          priceId = price.id;
        }

        sessionConfig.line_items = [{ price: priceId, quantity: 1 }];

        const session = await stripe.checkout.sessions.create(sessionConfig);
        return { url: session.url };
      } catch (err: any) {
        console.error("[Stripe] Failed to create subscription checkout session:", err);
        const rawMessage = typeof err?.message === "string" ? err.message : "";
        const isKeyProblem = /api key|api_key|invalid key|publishable key|secret key/i.test(rawMessage);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: isKeyProblem
            ? "Stripe is not configured correctly. On Render, set STRIPE_SECRET_KEY to the real Stripe secret key that starts with sk_live_ or sk_test_."
            : "Unable to open Stripe Checkout right now. Please try again shortly.",
        });
      }
    }),

  // Cancel subscription
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const sub = await getSubscriptionByUser(ctx.user.id);
    if (!sub?.stripeSubscriptionId) throw new TRPCError({ code: "NOT_FOUND", message: "No active subscription found" });
    
    try {
      await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    } catch (err) {
      console.error("[Stripe] Failed to cancel subscription:", err);
    }
    
    await revokeSubscription(ctx.user.id);
    await setUserVerified(ctx.user.id, false);
    return { success: true };
  }),

  // Admin: List all subscriptions
  adminListAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return getAllSubscriptions();
  }),

  // Admin: Revoke a subscription
  adminRevoke: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const sub = await getSubscriptionByUser(input.userId);
      if (sub?.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
        } catch {}
      }
      await revokeSubscription(input.userId);
      await setUserVerified(input.userId, false);
      return { success: true };
    }),

  // Admin: Grant subscription manually
  adminGrant: protectedProcedure
    .input(z.object({ userId: z.number(), tier: z.enum(["green", "golden", "diamond"]) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      
      const expiresAt = new Date();
      if (input.tier === "diamond") {
        expiresAt.setFullYear(expiresAt.getFullYear() + 100); // Lifetime
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month
      }

      await upsertSubscription({
        userId: input.userId,
        tier: input.tier,
        status: "active",
        expiresAt,
        stripeSubscriptionId: `manual_${input.userId}_${Date.now()}`,
      });

      await setUserVerified(input.userId, true);
      return { success: true };
    }),
});
