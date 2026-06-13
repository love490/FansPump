import Link from "next/link";
import { Rocket, Compass, Shield, ArrowLeftRight } from "lucide-react";

const steps = [
  {
    icon: Rocket,
    title: "Create your token",
    description:
      "Deploy an ERC20 on OPNChain with immutable feature flags, tiered creation fees, and optional tax or anti-bot settings.",
    href: "/create",
  },
  {
    icon: Compass,
    title: "Discover & grow",
    description:
      "List your project on FansPump so communities can explore, watchlist, and follow your token.",
    href: "/discover",
  },
  {
    icon: Shield,
    title: "Verify ownership",
    description:
      "Prove you control the creator wallet to earn a verified badge and build trust with holders.",
    href: "/verify",
  },
  {
    icon: ArrowLeftRight,
    title: "Swap & add liquidity",
    description:
      "Buy and sell with OPN, USDT, or USDC via the configured swap router, then onboard liquidity when ready.",
    href: "/swap",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold">How It Works</h1>
      <p className="mt-2 text-muted-foreground">
        FansPump is the token creation and discovery platform for the OPNChain ecosystem — built for serious
        projects, not meme casinos.
      </p>

      <ol className="mt-10 space-y-6">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-4 rounded-xl border border-border bg-card p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <step.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Step {i + 1}</p>
              <h2 className="text-lg font-semibold">{step.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              <Link href={step.href} className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
                Get started →
              </Link>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-8 text-sm text-muted-foreground">
        Need technical details? See the{" "}
        <Link href="/docs" className="text-primary hover:underline">
          documentation
        </Link>
        .
      </p>
    </div>
  );
}
