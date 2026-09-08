import { Check, CreditCard, Crown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useBestreads } from "@/lib/bestreads/store";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  "Browse every feed and the full Top 10",
  "Library limited to 5 books",
  "Up to 5 saved drafts",
  "Plain-text storefront links",
  "Single 3-pillar analytics chart",
];

const PRO_FEATURES = [
  "Unlimited library & unlimited drafts",
  "Advanced feed filters — length & upvotes",
  "Premium CTA buttons on your cards & profile",
  "Hour-by-hour / day-by-day Pro line charts",
  "Views, Buy-link clicks & Saves analytics",
  "Priority visibility in the Hall of Fame",
];

export function Pricing() {
  const { user, upgradeTier } = useBestreads();
  const tier = user?.tier ?? "free";
  const isPro = user?.isPro ?? false;

  const handleUpgrade = async (newTier: "pro_monthly" | "pro_annual") => {
    if (!user) {
      toast.error("Please sign in to upgrade.");
      return;
    }
    await upgradeTier(newTier);
    toast.success(
      newTier === "pro_annual"
        ? "Pro Annual unlocked — two months on the house! 🎉"
        : "Pro Monthly unlocked — enjoy unlimited everything! 🎉",
    );
  };

  const handleDowngrade = async () => {
    if (!user) return;
    await upgradeTier("free");
    toast("Switched to Free tier");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24">
      <header className="py-12 text-center">
        <h1 className="font-display text-4xl font-semibold">Support human writing</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upgrade seamlessly — tier changes take effect instantly across your entire session.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {/* FREE */}
        <div
          className={cn(
            "rounded-xl border border-border bg-card p-6 shadow-soft transition-shadow",
            tier === "free" && "ring-2 ring-ring",
          )}
        >
          <h2 className="font-display text-2xl font-semibold">Free</h2>
          <p className="text-metric mt-2 text-4xl font-semibold">0€</p>
          <p className="text-xs text-muted-foreground">Forever free</p>
          <ul className="mt-6 space-y-2 text-sm">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {f}
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            className="mt-6 w-full"
            disabled={tier === "free"}
            onClick={() => void handleDowngrade()}
          >
            {tier === "free" ? "Current plan" : "Switch to Free"}
          </Button>
        </div>

        {/* PRO MONTHLY */}
        <div
          className={cn(
            "rounded-xl border border-gold bg-card p-6 shadow-lift transition-shadow",
            tier === "pro_monthly" && "ring-2 ring-gold",
          )}
        >
          <div className="flex items-start justify-between">
            <h2 className="font-display text-2xl font-semibold">Pro Monthly</h2>
            <Crown className="size-5 text-gold-foreground mt-0.5" />
          </div>
          <p className="text-metric mt-2 text-4xl font-semibold">
            9€{" "}
            <span className="text-base font-normal text-muted-foreground">/month</span>
          </p>
          <p className="text-xs text-muted-foreground">Cancel any time</p>
          <ul className="mt-6 space-y-2 text-sm">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-verified" />
                {f}
              </li>
            ))}
          </ul>
          <Button
            className="mt-6 w-full"
            disabled={tier === "pro_monthly"}
            onClick={() => void handleUpgrade("pro_monthly")}
          >
            <CreditCard className="size-4" />
            {tier === "pro_monthly" ? "Current plan" : "Upgrade for 9€/month"}
          </Button>
        </div>

        {/* PRO ANNUAL */}
        <div
          className={cn(
            "relative rounded-xl border-2 border-gold bg-card p-6 shadow-lift transition-shadow",
            tier === "pro_annual" && "ring-2 ring-gold",
          )}
        >
          {/* Best value badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="rounded-full bg-gold px-3 py-0.5 text-xs font-bold text-gold-foreground shadow">
              Best Value
            </span>
          </div>
          <div className="flex items-start justify-between">
            <h2 className="font-display text-2xl font-semibold">Pro Annual</h2>
            <Crown className="size-5 text-gold-foreground mt-0.5 fill-current" />
          </div>
          <p className="text-metric mt-2 text-4xl font-semibold">
            69€{" "}
            <span className="text-base font-normal text-muted-foreground">/year</span>
          </p>
          <p className="text-xs text-muted-foreground">Two months free — 5.75€/mo equivalent</p>
          <ul className="mt-6 space-y-2 text-sm">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-verified" />
                {f}
              </li>
            ))}
          </ul>
          <Button
            className="mt-6 w-full shadow-lift"
            disabled={tier === "pro_annual"}
            onClick={() => void handleUpgrade("pro_annual")}
          >
            <Crown className="size-4" />
            {tier === "pro_annual" ? "Current plan" : "Upgrade for 69€/year"}
          </Button>
        </div>
      </div>

      {isPro && (
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Active plan:{" "}
          <strong>{tier === "pro_annual" ? "Pro Annual" : "Pro Monthly"}</strong> · Tier changes
          sync to your Supabase account instantly.
        </p>
      )}
    </div>
  );
}
