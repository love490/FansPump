import { Lock, Flame, BadgeCheck, Star, Shield } from "lucide-react";

const TRUST_FEATURES = [
  {
    emoji: "🔒",
    icon: Lock,
    title: "Liquidity Lock Protection",
    description: "Track projects that lock LP — a core signal for community safety.",
  },
  {
    emoji: "🔥",
    icon: Flame,
    title: "Ownership Renouncement Support",
    description: "Surface tokens where ownership has been renounced on-chain.",
  },
  {
    emoji: "✅",
    icon: BadgeCheck,
    title: "Contract Verification",
    description: "Highlight verified projects with approved contract status.",
  },
  {
    emoji: "⭐",
    icon: Star,
    title: "Creator Reputation System",
    description: "Reward builders who consistently deliver quality — coming soon.",
    badge: "Coming soon",
  },
  {
    emoji: "🟢",
    icon: Shield,
    title: "Trust Score Engine",
    description: "Composite 0–100 scores from ownership, liquidity, and contract signals.",
  },
] as const;

export function LandingTrustPreview() {
  return (
    <section id="trust" className="space-y-6">
      <div className="max-w-2xl">
        <h2 className="text-xl font-bold sm:text-2xl">Why Trust FansPump?</h2>
        <p className="mt-2 text-muted-foreground">
          We help users identify safer and higher-quality token projects.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TRUST_FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="group relative rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:border-primary/25 hover:shadow-[0_0_28px_rgba(30,91,255,0.1)]"
          >
            {"badge" in feature && feature.badge && (
              <span className="absolute right-4 top-4 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {feature.badge}
              </span>
            )}
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden>
                {feature.emoji}
              </span>
              <div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
