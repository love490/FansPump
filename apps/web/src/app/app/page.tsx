import { redirect } from "next/navigation";

/** Legacy in-app home — unified with landing at `/`. */
export default function AppHomePage() {
  redirect("/");
}
