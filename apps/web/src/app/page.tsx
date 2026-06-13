import type { Metadata } from "next";
import { HomePage } from "@/components/home/home-page";

export const metadata: Metadata = {
  title: "FansPump — Trust & Growth Platform on OPNChain",
  description:
    "Create tokens, discover projects, evaluate trust, and track builders on the IOPn ecosystem. The trust & growth infrastructure for OPNChain.",
  openGraph: {
    title: "FansPump — Trust & Growth on OPNChain",
    description:
      "Launch tokens. Build communities. Earn trust — on the IOPn ecosystem.",
    type: "website",
  },
};

export default function Page() {
  return <HomePage />;
}
