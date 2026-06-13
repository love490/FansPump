import { redirect } from "next/navigation";

/** Legacy route — home lives at `/`. */
export default function HomeRedirectPage() {
  redirect("/");
}
