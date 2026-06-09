import Link from "next/link";
import {
  Compass,
  Eye,
  Rocket,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { FansPumpLogo } from "@/components/brand/fans-pump-logo";

const features = [
  { icon: Rocket, label: "Create Tokens", href: "/create" },
  { icon: Compass, label: "Discover Projects", href: "/discover" },
  { icon: ShieldCheck, label: "Verify Ownership", href: "/verify" },
  { icon: Users, label: "Build Communities", href: "/discover?section=featured" },
  { icon: Eye, label: "Gain Visibility", href: "/discover?section=trending" },
  { icon: TrendingUp, label: "Grow Together", href: "/home" },
] as const;

export function LandingFeatures() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="mx-auto mb-10 max-w-2xl text-center text-base text-muted-foreground sm:text-lg">
        The official token launch &amp; discovery platform for the IOPn ecosystem.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
        {features.map(({ icon: Icon, label, href }) => (
          <Link
            key={label}
            href={href}
            className="group flex flex-col items-center rounded-2xl p-4 text-center transition-colors hover:bg-muted/40 sm:p-6"
          >
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-card shadow-md ring-1 ring-border/60 transition-shadow group-hover:shadow-lg sm:h-20 sm:w-20">
              <Icon className="h-8 w-8 text-primary sm:h-9 sm:w-9" strokeWidth={1.75} />
            </div>
            <span className="text-sm font-bold text-foreground sm:text-base">{label}</span>
          </Link>
        ))}
      </div>

      <div className="relative mt-10 overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary to-blue-800 px-6 py-8 shadow-lg sm:mt-12 sm:flex sm:items-center sm:justify-between sm:px-10 sm:py-10">
        <div className="relative z-10 max-w-lg">
          <p className="text-xl font-bold text-white sm:text-2xl">Built for Builders.</p>
          <p className="mt-1 text-lg font-semibold text-white/90 sm:text-xl">Trusted by Communities.</p>
        </div>
        <div className="relative z-10 mt-6 sm:mt-0">
          <FansPumpLogo href="/" variant="light" showText size="lg" />
        </div>
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
      </div>
    </section>
  );
}
