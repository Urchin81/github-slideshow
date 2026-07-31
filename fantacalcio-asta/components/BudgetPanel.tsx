"use client";

import { RUOLI, RUOLI_MANTRA, RUOLO_LABEL, RUOLO_MANTRA_LABEL } from "@/lib/types";
import { computeBudgetResiduoTotale, computeRoleStats } from "@/lib/suggestions";
import { useAuctionStore } from "@/lib/store";

export function BudgetPanel() {
  const players = useAuctionStore((s) => s.players);
  const settings = useAuctionStore((s) => s.settings);

  const budgetResiduo = computeBudgetResiduoTotale(players, settings);
  const roleStats = computeRoleStats(players, settings);
  const isMantra = settings.modalita === "mantra";
  const ruoli: string[] = isMantra ? RUOLI_MANTRA : RUOLI;
  const label = (r: string) => (isMantra ? RUOLO_MANTRA_LABEL[r as keyof typeof RUOLO_MANTRA_LABEL] : RUOLO_LABEL[r as keyof typeof RUOLO_LABEL]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold text-lg mb-3">Budget</h2>
      <div className="flex justify-between items-baseline mb-4">
        <span className="text-slate-500">Residuo</span>
        <span className="text-2xl font-bold">
          {budgetResiduo} <span className="text-sm font-normal text-slate-400">/ {settings.budgetTotale}</span>
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400">
            <th className="pb-1">Ruolo</th>
            <th className="pb-1 text-right">Slot</th>
            <th className="pb-1 text-right">Budget res.</th>
            <th className="pb-1 text-right">Media/slot</th>
          </tr>
        </thead>
        <tbody>
          {ruoli.map((ruolo) => {
            const s = roleStats[ruolo];
            return (
              <tr key={ruolo} className="border-t border-slate-100">
                <td className="py-1" title={label(ruolo)}>
                  {isMantra ? ruolo : label(ruolo)}
                </td>
                <td className="py-1 text-right">
                  {s.slotOccupati}/{s.slotTotali}
                </td>
                <td className="py-1 text-right">{Math.round(s.budgetResiduoRuolo)}</td>
                <td className="py-1 text-right font-medium">
                  {s.slotRimanenti > 0 ? Math.round(s.prezzoMedioDisponibile) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
