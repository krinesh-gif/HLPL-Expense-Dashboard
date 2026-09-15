import { requireUser } from "@/lib/auth";
import PushToggle from "@/components/PushToggle";
import InstallHelp from "@/components/InstallHelp";

export default async function SettingsPage() {
  const s = await requireUser();
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-muted">Signed in as {s.name}.</p>
      </div>
      <InstallHelp />
      <PushToggle />
    </div>
  );
}
