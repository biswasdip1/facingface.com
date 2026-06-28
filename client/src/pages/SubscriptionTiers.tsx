import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Check, Zap, Crown, Star, Palette } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useThemeMode, type ThemeMode } from "@/contexts/ThemeModeContext";

const TIERS = [
  {
    id: "green",
    name: "Green",
    price: "£2",
    period: "/month",
    icon: Star,
    features: ["Verified badge", "Priority support"],
    popular: false,
  },
  {
    id: "golden",
    name: "Golden",
    price: "£5",
    period: "/month",
    icon: Zap,
    features: ["Verified badge", "Priority support", "Featured profile"],
    popular: true,
  },
  {
    id: "diamond",
    name: "Diamond",
    price: "£10",
    period: "one-time",
    icon: Crown,
    features: ["Verified badge", "Priority support", "Featured profile", "Lifetime access"],
    popular: false,
  },
];

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "white", label: "White" },
  { value: "lightblue", label: "Light Blue" },
  { value: "beige", label: "Soft Beige" },
  { value: "lightdark", label: "Light Dark" },
];

export default function SubscriptionTiers() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const { themeMode, setThemeMode } = useThemeMode();

  const { data: currentSub } = trpc.subscription.getMySubscription.useQuery();
  const checkoutMutation = trpc.subscription.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create checkout session");
    },
  });

  const handleSubscribe = async (tierId: string) => {
    if (!user) {
      navigate("/");
      return;
    }

    setSelectedTier(tierId);
    try {
      await checkoutMutation.mutateAsync({
        tier: tierId as "green" | "golden" | "diamond",
        origin: window.location.origin,
      });
    } catch (error) {
      console.error("Subscription error:", error);
    }
  };

  // Get tier-specific colors - using CSS custom properties for theme consistency
  const getTierColors = (tierId: string) => {
    // Use CSS variables that are defined in index.css for each theme
    const root = document.documentElement;
    const getVar = (name: string) => getComputedStyle(root).getPropertyValue(name).trim();

    switch (tierId) {
      case "green":
        return {
          bg: "bg-background",
          border: "border-border",
          gradient: "from-emerald-500 to-emerald-700",
          text: "text-emerald-700",
          badge: "bg-emerald-100 text-emerald-700",
          button: "bg-emerald-600 hover:bg-emerald-700 text-white",
          headerBg: "bg-emerald-600",
        };
      case "golden":
        return {
          bg: "bg-background",
          border: "border-border",
          gradient: "from-amber-500 to-amber-700",
          text: "text-amber-700",
          badge: "bg-amber-100 text-amber-700",
          button: "bg-amber-600 hover:bg-amber-700 text-white",
          headerBg: "bg-amber-600",
        };
      case "diamond":
        return {
          bg: "bg-background",
          border: "border-border",
          gradient: "from-blue-500 to-blue-700",
          text: "text-blue-700",
          badge: "bg-blue-100 text-blue-700",
          button: "bg-blue-600 hover:bg-blue-700 text-white",
          headerBg: "bg-blue-600",
        };
      default:
        return {
          bg: "bg-background",
          border: "border-border",
          gradient: "from-gray-400 to-gray-600",
          text: "text-gray-700",
          badge: "bg-gray-100 text-gray-700",
          button: "bg-gray-500 hover:bg-gray-600 text-white",
          headerBg: "bg-gray-500",
        };
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 bg-background text-foreground">
      <div className="max-w-7xl mx-auto">
        {/* Theme Selector */}
        <div className="mb-8 flex items-center justify-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Theme:</span>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setThemeMode(option.value)}
                className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                  themeMode === option.value
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-secondary text-secondary-foreground hover:bg-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl opacity-70">
            Get verified and unlock exclusive features
          </p>
        </div>

        {/* Current Subscription Badge */}
        {currentSub?.isActive && (
          <div className={`mb-8 p-4 bg-card border border-border/40 rounded-lg text-center`}>
            <p className="font-semibold">
              ✅ You're currently subscribed to <strong>{currentSub.tier?.toUpperCase()}</strong>
            </p>
          </div>
        )}

        {/* Tier Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            const isCurrentTier = currentSub?.tier === tier.id && currentSub?.isActive;
            const colors = getTierColors(tier.id);

            return (
              <div
                key={tier.id}
                className={`relative rounded-2xl overflow-hidden transition-transform hover:scale-105 ${
                  tier.popular ? "md:scale-105 shadow-2xl" : "shadow-lg"
                } bg-card border border-border/40`}
              >
                {/* Popular Badge */}
                {tier.popular && (
                  <div className={`absolute top-0 left-0 right-0 bg-gradient-to-r ${colors.gradient} text-white py-2 text-center font-bold text-sm`}>
                    MOST POPULAR
                  </div>
                )}

                <div className={`bg-gradient-to-br ${colors.gradient} p-8 text-white`}>
                  <div className="flex items-center gap-3 mb-4">
                    <Icon className="w-8 h-8" />
                    <h2 className="text-3xl font-bold">{tier.name}</h2>
                  </div>

                  <div className="mb-6">
                    <div className="text-5xl font-bold">{tier.price}</div>
                    <div className="text-sm opacity-90">{tier.period}</div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Button */}
                  <Button
                    onClick={() => handleSubscribe(tier.id)}
                    disabled={checkoutMutation.isPending || isCurrentTier}
                    className={`w-full font-bold py-3 ${
                      isCurrentTier
                        ? "bg-white/30 text-white cursor-default"
                        : `${colors.button}`
                    }`}
                  >
                    {isCurrentTier ? "✓ Current Plan" : checkoutMutation.isPending && selectedTier === tier.id ? "Processing..." : "Subscribe Now"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto bg-card border border-border/40 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6">Frequently Asked Questions</h3>

          <div className="space-y-6">
            <div>
              <h4 className="font-bold mb-2">What's the difference between tiers?</h4>
              <p className="opacity-70">
                All tiers include a verified badge. Golden adds featured profile visibility. Diamond is a one-time lifetime purchase.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-2">Can I cancel anytime?</h4>
              <p className="opacity-70">
                Yes! Monthly subscriptions can be cancelled anytime. Diamond is a one-time purchase with lifetime access.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-2">How do I get the verified badge?</h4>
              <p className="opacity-70">
                Once you subscribe, your profile will be automatically verified with a badge within minutes.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-2">What payment methods do you accept?</h4>
              <p className="opacity-70">
                We accept all major credit and debit cards through Stripe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
