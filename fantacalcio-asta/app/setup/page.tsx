import { ImportListino } from "@/components/ImportListino";
import { SettingsForm } from "@/components/SettingsForm";

export default function SetupPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <ImportListino />
      <SettingsForm />
    </div>
  );
}
