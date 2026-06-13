import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type OverviewStat = {
  label: string;
  value: string;
};

type PlatformPersonalOverviewProps = {
  platformTitle: string;
  platformDescription?: string;
  platformStats: OverviewStat[];
  personalTitle: string;
  personalDescription?: string;
  personalStats: OverviewStat[];
  personalHint?: string;
  loading?: boolean;
  className?: string;
};

function StatGrid({ stats, loading }: { stats: OverviewStat[]; loading?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-border/80 bg-muted/30 px-4 py-3"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {stat.label}
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{loading ? "…" : stat.value}</p>
        </div>
      ))}
    </div>
  );
}

export function PlatformPersonalOverview({
  platformTitle,
  platformDescription,
  platformStats,
  personalTitle,
  personalDescription,
  personalStats,
  personalHint,
  loading,
  className,
}: PlatformPersonalOverviewProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{platformTitle}</CardTitle>
          {platformDescription && <CardDescription>{platformDescription}</CardDescription>}
        </CardHeader>
        <CardContent>
          <StatGrid stats={platformStats} loading={loading} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{personalTitle}</CardTitle>
          {personalDescription && <CardDescription>{personalDescription}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-3">
          {personalHint && personalStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">{personalHint}</p>
          ) : (
            <StatGrid stats={personalStats} loading={loading} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
