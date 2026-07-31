import { PlatformAnalyticsDashboard } from "@/components/analytics/platform-analytics-dashboard";

export const metadata = {
  title: "Analytics | FansPump",
  description: "Platform-wide analytics for the FansPump ecosystem — tokens, liquidity, trading, and growth.",
};

export default function AnalyticsPage() {
  return <PlatformAnalyticsDashboard />;
}
