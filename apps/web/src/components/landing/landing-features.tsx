import Link from "next/link";
import Image from "next/image";
import {
  Compass,
  Eye,
  Rocket,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { BRAND_BLUE } from "@/lib/brand";

const features = [
  { icon: Rocket, label: "Create Tokens", href: "/create" },
  { icon: Compass, label: "Discover Projects", href: "/discover" },
  { icon: ShieldCheck, label: "Verify Ownership", href: "/verify" },
  { icon: Users, label: "Build Communities", href: "/discover?section=featured" },
  { icon: Eye, label: "Gain Visibility", href: "/discover?section=trending" },
  { icon: TrendingUp, label: "Grow Together", href: "/app" },
] as const;

export function LandingFeatures() {
  return (
    <section id="features" className="w-full px-4 py-16 sm:px-6 sm:py-20 lg:px-8 xl:px-10">
      <div
        className="overflow-hidden rounded-2xl px-5 py-8 shadow-lg sm:px-8 sm:py-10"
        style={{ backgroundColor: BRAND_BLUE }}
      >
        <p className="mx-auto max-w-2xl text-center text-base font-medium text-white sm:text-lg">
          The official token launch &amp; discovery platform for the IOPn ecosystem.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, label, href }) => (
            <Link
              key={label}
              href={href}
              className="group flex flex-col items-center rounded-xl bg-white/10 p-4 text-center ring-1 ring-white/15 transition-colors hover:bg-white/20 sm:p-5"
            >
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-md transition-shadow group-hover:shadow-lg sm:h-16 sm:w-16">
                <Icon className="h-7 w-7 sm:h-8 sm:w-8" style={{ color: BRAND_BLUE }} strokeWidth={1.75} />
              </div>
              <span className="text-sm font-bold text-white sm:text-base">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div
        className="relative mt-10 overflow-hidden rounded-2xl px-6 py-8 shadow-lg sm:mt-12 sm:flex sm:items-center sm:justify-between sm:px-10 sm:py-10"
        style={{ backgroundColor: BRAND_BLUE }}
      >
        <div className="relative z-10 max-w-lg">
          <p className="text-xl font-bold text-white sm:text-2xl">Built for Builders.</p>
          <p className="mt-1 text-lg font-semibold text-white/90 sm:text-xl">Trusted by Communities.</p>
        </div>
        <div className="relative z-10 mt-6 shrink-0 sm:mt-0">
          <Link href="/" className="block" aria-label="FansPump home">
            <div
              className="relative h-20 w-20 overflow-hidden sm:h-28 sm:w-28"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <Image
                src="/images/logo-brand.png"
                alt=""
                fill
                priority
                className="scale-[1.18] object-cover"
                sizes="112px"
              />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
