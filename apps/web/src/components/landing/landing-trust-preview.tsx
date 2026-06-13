import { ContractVerifiedIcon } from "@/components/icons/contract-verified-icon";
import { cn } from "@/lib/utils";

const TRUST_FEATURES = [
  {
    emoji: "🔒",
    title: "Liquidity Lock Protection",
    description: "Track projects that lock LP — a core signal for community safety.",
    gradient: "from-blue-600/20 via-blue-500/10 to-cyan-500/5",
    border: "border-blue-500/30",
    glow: "hover:shadow-[0_0_28px_rgba(59,130,246,0.2)]",
  },
  {
    emoji: "🔥",
    title: "Ownership Renouncement Support",
    description: "Surface tokens where ownership has been renounced on-chain.",
    gradient: "from-orange-600/20 via-orange-500/10 to-amber-500/5",
    border: "border-orange-500/30",
    glow: "hover:shadow-[0_0_28px_rgba(249,115,22,0.2)]",
  },
  {
    emoji: "✅",
    customIcon: ContractVerifiedIcon,
    title: "Contract Verification",
    description: "Highlight verified projects with approved contract status.",
    gradient: "from-emerald-600/20 via-green-500/10 to-teal-500/5",
    border: "border-emerald-500/30",
    glow: "hover:shadow-[0_0_28px_rgba(34,197,94,0.2)]",
  },
  {
    emoji: "⭐",
    title: "Creator Reputation System",
    description: "Discover builders with solid reputation — coming soon.",
    badge: "Coming soon",
    gradient: "from-violet-600/20 via-purple-500/10 to-fuchsia-500/5",
    border: "border-violet-500/30",
    glow: "hover:shadow-[0_0_28px_rgba(139,92,246,0.2)]",
  },
  {
    emoji: "🟢",
    title: "Trust Score Engine",
    description: "Composite 0–100 scores from ownership, liquidity, and contract signals.",
    gradient: "from-teal-600/20 via-emerald-500/10 to-lime-500/5",
    border: "border-teal-500/30",
    glow: "hover:shadow-[0_0_28px_rgba(20,184,166,0.2)]",
  },
] as const;

export function LandingTrustPreview() {
  return (
    <section id="trust" className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-violet-500/10 to-cyan-500/10 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
        <h2 className="relative text-xl font-bold sm:text-2xl">Why Trust FansPump?</h2>
        <p className="relative mt-2 max-w-2xl text-muted-foreground">
          We help users identify safer and higher-quality token projects.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TRUST_FEATURES.map((feature) => (
          <div
            key={feature.title}
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 shadow-sm transition-all duration-300",
              feature.gradient,
              feature.border,
              feature.glow
            )}
          >
            {"badge" in feature && feature.badge && (
              <span className="absolute right-4 top-4 rounded-full border border-violet-400/30 bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-200">
                {feature.badge}
              </span>
            )}
            <div className="flex items-start gap-3">
              {"customIcon" in feature && feature.customIcon ? (
                <feature.customIcon size={28} className="mt-0.5 shrink-0" />
              ) : (
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-xl backdrop-blur-sm"
                  aria-hidden
                >
                  {feature.emoji}
                </span>
              )}
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
