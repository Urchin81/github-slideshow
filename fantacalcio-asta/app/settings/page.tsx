import { ImportListino } from "@/components/ImportListino";
import { SettingsForm } from "@/components/SettingsForm";
import { NewsUpdatePanel } from "@/components/NewsUpdatePanel";
import { StatsUpdatePanel } from "@/components/StatsUpdatePanel";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <ImportListino />
      <SettingsForm />
      <div>
        <h2 className="font-semibold text-lg mb-2">Aggiornamento dati</h2>
        <div className="space-y-3">
          <NewsUpdatePanel />
          <StatsUpdatePanel />
        </div>
      </div>
    </div>
  );
}
