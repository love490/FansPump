"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isToolsNavLinkActive, toolsMenuNavLinks } from "@/lib/navigation/tools-nav";

type ToolsSubNavProps = {
  className?: string;
  onNavigate?: () => void;
  compact?: boolean;
};

export function ToolsSubNav({ className, onNavigate, compact }: ToolsSubNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex flex-nowrap items-center justify-center gap-x-5 overflow-x-auto border-b border-border bg-transparent px-1 py-3 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-x-8 sm:px-4 lg:gap-x-10 lg:px-6 [&::-webkit-scrollbar]:hidden",
        compact && "gap-x-4 px-2 py-2 sm:gap-x-6",
        className
      )}
      aria-label="Tools navigation"
    >
      {toolsMenuNavLinks.map((link) => {
        const active = isToolsNavLinkActive(pathname, link.href);
        return (
          <Link
            key={link.id}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "shrink-0 whitespace-nowrap text-xs font-bold transition-colors sm:text-sm",
              compact && "text-xs sm:text-sm",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
