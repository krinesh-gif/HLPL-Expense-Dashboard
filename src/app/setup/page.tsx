import { redirect } from "next/navigation";
import { isSetupNeeded } from "@/app/actions/setup";
import SetupForm from "@/components/SetupForm";

// Must be evaluated per request so it closes as soon as the first user exists.
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!(await isSetupNeeded())) redirect("/login");
  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">Hivefy Lifestyle</p>
        <h1 className="mt-1 text-xl font-semibold">Set up the dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          This creates the expense category master and your founder account. It runs once
          and is then closed permanently.
        </p>
        <SetupForm />
      </div>
    </main>
  );
}
