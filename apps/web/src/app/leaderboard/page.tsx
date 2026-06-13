import { redirect } from "next/navigation";

/** Legacy route — Explore lives at `/explore`. */
export default function LeaderboardRedirectPage() {
  redirect("/explore");
}
