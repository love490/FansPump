import { redirect } from "next/navigation";

/** Legacy route — dashboard lives at /app. */
export default function HomeRedirect() {
  redirect("/app");
}
