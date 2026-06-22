import type { LucideIcon } from "lucide-react";
import { Flame, Lock } from "lucide-react";

export type ToolsNavLink = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
};

export const toolsMenuNavLinks: ToolsNavLink[] = [
  { id: "lock", href: "/tools/lock", label: "Lock", icon: Lock },
  { id: "burn", href: "/tools/burn", label: "Burn", icon: Flame },
];

export function isToolsNavLinkActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isToolsPath(pathname: string): boolean {
  return pathname === "/tools" || pathname.startsWith("/tools/");
}
