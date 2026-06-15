import { redirect } from "next/navigation";

export default function LaunchpadRedirectPage() {
  redirect("/staking?tab=launchpool");
}
