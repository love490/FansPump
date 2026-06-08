export type AdminPermission =
  | "overview"
  | "creation_fees"
  | "trading_fees"
  | "treasury"
  | "verification"
  | "discovery"
  | "analytics"
  | "creator_earnings"
  | "pool_share"
  | "bridge"
  | "security"
  | "system"
  | "activity_logs"
  | "roles"
  | "factory"
  | "write";

export type AdminRole = "SUPER_ADMIN" | "MODERATOR" | "SUPPORT" | "VIEWER";
