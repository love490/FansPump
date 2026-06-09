import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "FansPump — Token Launch & Discovery on OPNChain",
  description:
    "The official token launch and discovery platform for the IOPn ecosystem. Create tokens, verify ownership, swap, and grow your community on OPNChain.",
  openGraph: {
    title: "FansPump — Token Launch & Discovery",
    description:
      "Create tokens, discover projects, and grow your community on OPNChain.",
    type: "website",
  },
};

export default function HomePage() {
  return <LandingPage />;
}
