import type { Express, Request, Response } from "express";
import express from "express";
import { stripe } from "./stripe";
import { upsertSubscription, revokeSubscription, setUserVerified, getSubscriptionByStripeId } from "./db";

export function registerStripeWebhook(app: Express) {
  // MUST use raw body before json() middleware — registered in index.ts before express.json()
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event: ReturnType<typeof stripe.webhooks.constructEvent>;
      try {
        if (!webhookSecret) {
          // Dev mode without webhook secret — parse body directly
          event = JSON.parse(req.body.toString());
        } else {
          event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        }
      } catch (err: any) {
        console.error("[Stripe Webhook] Signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Test event — return verification response
      if ((event as any).id?.startsWith("evt_test_")) {
        console.log("[Stripe Webhook] Test event detected");
        return res.json({ verified: true });
      }

      console.log(`[Stripe Webhook] Event: ${event.type}`);

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as any;
            const userId = parseInt(session.metadata?.user_id ?? session.client_reference_id ?? "0");
            const tier = session.metadata?.tier ?? "green";
            if (!userId) break;
            
            // Calculate expiration based on tier
            const expiresAt = new Date();
            if (tier === "diamond") {
              expiresAt.setFullYear(expiresAt.getFullYear() + 100); // Lifetime
            } else {
              expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month for green/golden
            }
            
            await upsertSubscription({
              userId,
              tier,
              stripeCustomerId: session.customer ?? null,
              stripeSubscriptionId: session.subscription ?? null,
              status: "active",
              badgeGranted: true,
              expiresAt,
            });
            await setUserVerified(userId, true);
            console.log(`[Stripe] ${tier.toUpperCase()} subscription granted to user ${userId}`);
            break;
          }

          case "customer.subscription.updated": {
            const sub = event.data.object as any;
            // Prefer metadata user_id; fall back to DB lookup by subscription ID
            let userId = parseInt(sub.metadata?.user_id ?? "0");
            if (!userId) {
              const existing = await getSubscriptionByStripeId(sub.id);
              userId = existing?.userId ?? 0;
            }
            if (!userId) break;
            const isActive = sub.status === "active" || sub.status === "trialing";
            await upsertSubscription({
              userId,
              stripeSubscriptionId: sub.id,
              status: sub.status as any,
              badgeGranted: isActive,
            });
            await setUserVerified(userId, isActive);
            break;
          }

          case "customer.subscription.deleted": {
            const sub = event.data.object as any;
            let userId = parseInt(sub.metadata?.user_id ?? "0");
            if (!userId) {
              const existing = await getSubscriptionByStripeId(sub.id);
              userId = existing?.userId ?? 0;
            }
            if (!userId) break;
            await revokeSubscription(userId);
            await setUserVerified(userId, false);
            console.log(`[Stripe] Blue badge revoked for user ${userId}`);
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as any;
            // invoice.subscription holds the subscription ID
            let userId = parseInt(invoice.metadata?.user_id ?? "0");
            if (!userId && invoice.subscription) {
              const existing = await getSubscriptionByStripeId(invoice.subscription);
              userId = existing?.userId ?? 0;
            }
            if (!userId) break;
            await upsertSubscription({
              userId,
              status: "past_due",
              badgeGranted: false,
            });
            await setUserVerified(userId, false);
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error("[Stripe Webhook] Handler error:", err);
        return res.status(500).json({ error: "Internal error" });
      }

      res.json({ received: true });
    }
  );
}
