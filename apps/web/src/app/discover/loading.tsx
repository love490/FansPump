import { Loader2 } from "lucide-react";

export default function DiscoverLoading() {
  return (
    <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-24 text-muted-foreground">
      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
      Loading discover…
    </div>
  );
}
