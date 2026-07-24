import { PageHeader } from "@/components/ui";
import { SettingsForm } from "@/components/SettingsForm";
import { UsageStats } from "@/components/UsageStats";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Settings"
        subtitle="Personalise your portal — saved in this browser."
      />
      <div className="mb-6">
        <UsageStats />
      </div>
      <SettingsForm />
    </div>
  );
}
