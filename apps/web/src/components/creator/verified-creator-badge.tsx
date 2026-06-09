import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export function VerifiedCreatorBadge({
  walletAddress,
  compact = false,
}: {
  walletAddress?: string;
  compact?: boolean;
}) {
  return (
    <Badge variant="verified" className="gap-1">
      <CheckCircle2 className="h-3 w-3" />
      {compact ? "Verified" : "Verified Creator"}
      {walletAddress && (
        <Link
          href={`/creator/${walletAddress}`}
          className="ml-1 underline-offset-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          ✓
        </Link>
      )}
    </Badge>
  );
}
