import { redirect } from "next/navigation";
import { isSetupNeeded } from "@/app/actions/setup";
import LoginForm from "./LoginForm";

// Whether setup is still pending depends on the database, so this must not be prerendered at build time.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // A freshly deployed instance has nobody to sign in as; send it to first-run setup.
  if (await isSetupNeeded()) redirect("/setup");
  return <LoginForm />;
}
