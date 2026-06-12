import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Admin Sign In | FansPump",
  description: "Platform administrator email and password sign-in",
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
