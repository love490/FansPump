"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminNavLink({ className }: { className?: string }) {
  const { address } = useAccount();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!address) {
      setIsAdmin(false);
      return;
    }
    fetch(`/api/admin/check?wallet=${address}`)
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.isAdmin));
  }, [address]);

  if (!isAdmin) return null;

  return (
    <Link
      href="/admin"
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        pathname.startsWith("/admin")
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
    >
      <Shield className="h-4 w-4 shrink-0" />
      Admin
    </Link>
  );
}
