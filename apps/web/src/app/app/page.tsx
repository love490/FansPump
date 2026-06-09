import { redirect } from "next/navigation";

/** Legacy route — dashboard moved to /home. */
export default function AppHomeRedirect() {
  redirect("/home");
}
