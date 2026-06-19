import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TrustScan — OPN Chain Intelligence",
  description:
    "Analyze any OPN Chain token contract or wallet. Trust scores, risk flags, and deployer intelligence. No signup required.",
};

export default function TrustScanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
