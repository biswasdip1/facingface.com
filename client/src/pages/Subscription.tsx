import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, BadgeCheck, Crown, Shield, Zap, Star } from "lucide-react";
import { toast } from "sonner";

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  
  // Redirect to new subscription tiers page
  React.useEffect(() => {
    navigate("/subscription-tiers");
  }, [navigate]);

  const { data: subscription, isLoading } = trpc.subscription.getMySubscription.useQuery(undefined, {
    enabled: !!user,
  });

  const createCheckout = trpc.subscription.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to secure payment page...");
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to start checkout");
      setLoading(false);
    },
  });

  const cancelSub = trpc.subscription.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success("Subscription cancelled. Your badge will be removed.");
      window.location.reload();
    },
    onError: (err) => toast.error(err.message || "Failed to cancel subscription"),
  });

  const handleSubscribe = () => {
    if (!user) {
      navigate("/");
      return;
    }
    setLoading(true);
    createCheckout.mutate({ origin: window.location.origin });
  };

  const isActive = subscription?.badgeGranted && subscription?.status === "active";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <h1 className="font-bold text-lg">FacingFace Blue Badge</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <BadgeCheck className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <h2 className="text-3xl font-bold">Get Verified</h2>
          <p className="text-muted-foreground text-lg">
            Show the world your account is authentic with the official FacingFace blue badge.
          </p>
        </div>

        {/* Current status */}
        {isActive && (
          <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
            <CardContent className="pt-6 flex items-center gap-4">
              <BadgeCheck className="w-8 h-8 text-blue-500 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-blue-700 dark:text-blue-300">You are verified!</p>
                <p className="text-sm text-muted-foreground">Your blue badge is active and visible on your profile and posts.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cancelSub.mutate()}
                disabled={cancelSub.isPending}
                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                {cancelSub.isPending ? "Cancelling..." : "Cancel"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pricing card */}
        <Card className="relative overflow-hidden border-2 border-blue-500 shadow-lg">
          <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
            MOST POPULAR
          </div>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              <CardTitle className="text-xl">Blue Badge</CardTitle>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-4xl font-bold">£2.00</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <CardDescription>Cancel anytime. No hidden fees.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {[
                { icon: BadgeCheck, text: "Blue ✓ badge on your profile" },
                { icon: CheckCircle, text: "Badge on all your posts" },
                { icon: CheckCircle, text: "Badge in messages and comments" },
                { icon: Shield, text: "Verified account status" },
                { icon: Star, text: "Priority in search results" },
                { icon: Zap, text: "Exclusive verified member features" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm">
                  <Icon className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            {!isActive && (
              <Button
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-6 text-base mt-4"
                onClick={handleSubscribe}
                disabled={loading || createCheckout.isPending || isLoading}
              >
                {loading || createCheckout.isPending ? (
                  "Opening checkout..."
                ) : user ? (
                  "Subscribe Now — £2.00/month"
                ) : (
                  "Sign in to Subscribe"
                )}
              </Button>
            )}

            {isActive && (
              <div className="w-full text-center py-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center justify-center gap-2">
                  <BadgeCheck className="w-4 h-4" /> Active subscription
                </span>
              </div>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Secure payment opens on Stripe Checkout. FacingFace never stores your card details.
            </p>
          </CardContent>
        </Card>

        {/* FAQ */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Frequently Asked Questions</h3>
          {[
            { q: "How do I get the badge?", a: "Subscribe above. After payment, your blue badge appears automatically on your profile, posts, and messages within seconds." },
            { q: "Can I cancel anytime?", a: "Yes. Click 'Cancel' on this page. Your badge will be removed at the end of the current billing period." },
            { q: "Is my payment secure?", a: "Yes. All payments are processed by Stripe — the same provider used by Twitter, Shopify, and Airbnb. We never see your card details." },
            { q: "What happens if my payment fails?", a: "Your badge will be temporarily suspended until the payment is retried. Stripe will attempt to collect payment automatically." },
          ].map(({ q, a }) => (
            <div key={q} className="border rounded-lg p-4 space-y-1">
              <p className="font-medium text-sm">{q}</p>
              <p className="text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Success page shown after Stripe redirects back */
export function SubscriptionSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <BadgeCheck className="w-12 h-12 text-green-500" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">You're Verified!</h1>
        <p className="text-muted-foreground text-lg">
          Your blue badge is now active. It will appear on your profile, posts, messages, and comments.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/profile">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">View My Profile</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Go to Feed</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
