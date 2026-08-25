"use client";

import { RUOLI, RUOLO_LABEL } from "@/lib/types";
import {
  computeBudgetResiduoTotale,
  computeCoperturaModuli,
  computeMantraStato,
  computeRoleStats,
  computeScarsitaClassic,
  computeScarsitaMantra,
  ScarsitaRuolo,
} from "@/lib/suggestions";
import { useAuctionStore } from "@/lib/store";

function AllertaScarsita({ scarsita, numeroPartecipanti }: { scarsita: ScarsitaRuolo[]; numeroPartecipanti: number }) {
  const scarsi = scarsita.filter((s) => s.allerta);
  if (scarsi.length === 0) return null;
  return (
    <div className="mb-4">
      <h3 className="text-xs uppercase text-amber-600 mb-1">⚠️ Ruoli in esaurimento</h3>
      <div className="flex flex-wrap gap-1">
        {scarsi.map((s) => (
          <span
            key={s.chiave}
            className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded px-2 py-1"
            title={`Restano ${s.titolariDisponibili} titolari su ${s.titolariTotali} stimati per ${numeroPartecipanti} partecipanti`}
          >
            {s.label} · {s.titolariDisponibili} rimasti
          </span>
        ))}
      </div>
    </div>
  );
}

function PannelloClassic() {
  const players = useAuctionStore((s) => s.players);
  const settings = useAuctionStore((s) => s.settings);
  const budgetResiduo = computeBudgetResiduoTotale(players, settings);
  const roleStats = computeRoleStats(players, settings);
  const scarsita = computeScarsitaClassic(players, settings);

  return (
    <>
      <div className="flex justify-between items-baseline mb-4">
        <span className="text-slate-500">Residuo</span>
        <span className="text-2xl font-bold">
          {budgetResiduo} <span className="text-sm font-normal text-slate-400">/ {settings.budgetTotale}</span>
        </span>
      </div>
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="text-left text-slate-400">
            <th className="pb-1">Ruolo</th>
            <th className="pb-1 text-right">Slot</th>
            <th className="pb-1 text-right">Budget res.</th>
            <th className="pb-1 text-right">Media/slot</th>
          </tr>
        </thead>
        <tbody>
          {RUOLI.map((ruolo) => {
            const s = roleStats[ruolo];
            return (
              <tr key={ruolo} className="border-t border-slate-100">
                <td className="py-1" title={RUOLO_LABEL[ruolo]}>
                  {RUOLO_LABEL[ruolo]}
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
      <AllertaScarsita scarsita={scarsita} numeroPartecipanti={settings.numeroPartecipanti} />
    </>
  );
}

function PannelloMantra() {
  const players = useAuctionStore((s) => s.players);
  const settings = useAuctionStore((s) => s.settings);
  const stato = computeMantraStato(players, settings);
  const coperture = computeCoperturaModuli(players);
  const scarsita = computeScarsitaMantra(players, settings);

  return (
    <>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-slate-500">Residuo</span>
        <span className="text-2xl font-bold">
          {stato.budgetResiduo} <span className="text-sm font-normal text-slate-400">/ {settings.budgetTotale}</span>
        </span>
      </div>
      <div className="flex justify-between items-baseline mb-4 text-sm">
        <span className="text-slate-500">Giocatori presi</span>
        <span className="font-medium">
          {stato.acquistati} <span className="text-slate-400">(min {stato.min} · max {stato.max})</span>
        </span>
      </div>
      {stato.postiRimanenti === 0 && (
        <p className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded p-2 mb-3">
          Hai raggiunto il numero massimo di giocatori acquistabili.
        </p>
      )}

      <AllertaScarsita scarsita={scarsita} numeroPartecipanti={settings.numeroPartecipanti} />

      <h3 className="text-xs uppercase text-slate-400 mb-1">Moduli più vicini al completamento</h3>
      <ul className="text-sm space-y-1">
        {coperture.slice(0, 5).map((m) => (
          <li key={m.nome} className="flex items-center justify-between">
            <span>{m.nome}</span>
            <span className="flex items-center gap-2">
              <span className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <span
                  className="block h-full bg-green-500"
                  style={{ width: `${(m.coperti / m.totale) * 100}%` }}
                />
              </span>
              <span className="text-slate-400 text-xs">
                {m.coperti}/{m.totale}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function BudgetPanel() {
  const settings = useAuctionStore((s) => s.settings);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold text-lg mb-3">Budget</h2>
      {settings.modalita === "classic" ? <PannelloClassic /> : <PannelloMantra />}
    </div>
  );
}
