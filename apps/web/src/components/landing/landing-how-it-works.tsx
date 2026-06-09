import Link from "next/link";
import { ArrowLeftRight, Compass, Rocket, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Rocket,
    title: "Create your token",
    description: "Deploy on OPNChain with configurable features, taxes, and metadata.",
    href: "/create",
  },
  {
    icon: Compass,
    title: "Get discovered",
    description: "List on FansPump so communities can explore, watchlist, and follow.",
    href: "/discover",
  },
  {
    icon: Shield,
    title: "Verify ownership",
    description: "Sign with your creator wallet to earn a verified badge.",
    href: "/verify",
  },
  {
    icon: ArrowLeftRight,
    title: "Swap & add liquidity",
    description: "Trade via the DEX router and add liquidity when you're ready.",
    href: "/swap",
  },
] as const;

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-border bg-muted/20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">How It Works</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            From launch to liquidity — everything you need on OPNChain.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Step {i + 1}
              </span>
              <div className="mt-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <step.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{step.description}</p>
              <Link
                href={step.href}
                className="mt-4 text-sm font-medium text-primary hover:underline"
              >
                Get started →
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/home">Launch App</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/docs/how-it-works">Read full guide</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
