"use client";

import { useMemo, useState } from "react";
import { Calculator, ShieldAlert, Users, Wallet } from "lucide-react";
import { RUOLI, RUOLO_LABEL, RUOLO_MANTRA_COLORE } from "@/lib/types";
import {
  computeBudgetResiduoTotale,
  computeCoperturaModuli,
  computeDettaglioModulo,
  computeMantraStato,
  computePianoSpesaMantra,
  computeRoleStats,
  computeValoreMedioAcquisto,
  SOGLIA_RAPPORTO_CONSIGLIATO,
} from "@/lib/suggestions";
import { coloreSfondoSlot, MODULI_MANTRA, Modulo } from "@/lib/moduliMantra";
import { ModuloVisualizzazione } from "@/components/ModuloVisualizzazione";
import { useAuctionStore } from "@/lib/store";

function PannelloClassic() {
  const players = useAuctionStore((s) => s.players);
  const settings = useAuctionStore((s) => s.settings);
  const budgetResiduo = computeBudgetResiduoTotale(players, settings);
  const roleStats = computeRoleStats(players, settings);
  const valoreMedioAcquisto = computeValoreMedioAcquisto(players, settings);

  return (
    <>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-slate-500">Residuo</span>
        <span className="text-2xl font-bold">
          {budgetResiduo} <span className="text-sm font-normal text-slate-400">/ {settings.budgetTotale}</span>
        </span>
      </div>
      <div
        className="flex justify-between items-baseline mb-4 text-sm"
        title="Budget residuo diviso per i giocatori ancora mancanti per completare la rosa (portieri inclusi secondo lo slot Portiere configurato). Se la rosa è già completa, mostra l'intero budget residuo."
      >
        <span className="text-slate-500">Valore medio disponibile</span>
        <span className="font-medium">{Math.round(valoreMedioAcquisto)}</span>
      </div>
      <h3 className="text-xs uppercase text-slate-400 mb-1">Piano di spesa per ruolo residuo</h3>
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="text-left text-slate-400">
            <th className="pb-1">Ruolo</th>
            <th className="pb-1 text-right" title="Slot occupati / slot totali per questo ruolo">
              <Users size={14} className="inline-block" />
            </th>
            <th className="pb-1 text-right" title="Budget residuo assegnato a questo ruolo">
              <Wallet size={14} className="inline-block" />
            </th>
            <th className="pb-1 text-right" title="Media disponibile per ogni slot ancora da riempire in questo ruolo">
              <Calculator size={14} className="inline-block" />
            </th>
            <th className="pb-1 text-right" title="Tetto prudente: soglia (+30% della media) oltre la quale conviene evitare di sforare per questo ruolo">
              <ShieldAlert size={14} className="inline-block" />
            </th>
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
                <td className="py-1 text-right text-slate-500">
                  {s.slotRimanenti > 0 ? Math.round(s.prezzoMedioDisponibile * SOGLIA_RAPPORTO_CONSIGLIATO) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function PannelloMantra() {
  const players = useAuctionStore((s) => s.players);
  const settings = useAuctionStore((s) => s.settings);
  const stato = computeMantraStato(players, settings);
  const coperture = computeCoperturaModuli(players);
  const pianoSpesa = computePianoSpesaMantra(players, settings);
  const valoreMedioAcquisto = computeValoreMedioAcquisto(players, settings);
  const mieiMantra = players.filter((p) => p.stato === "mia");
  const moduliByNome = new Map(MODULI_MANTRA.map((m) => [m.nome, m]));
  const [moduloAperto, setModuloAperto] = useState<Modulo | null>(null);
  const dettagliByNome = useMemo(
    () => new Map(MODULI_MANTRA.map((m) => [m.nome, computeDettaglioModulo(players, m)])),
    [players]
  );

  return (
    <>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-slate-500">Residuo</span>
        <span className="text-2xl font-bold">
          {stato.budgetResiduo} <span className="text-sm font-normal text-slate-400">/ {settings.budgetTotale}</span>
        </span>
      </div>
      <div
        className="flex justify-between items-baseline mb-1 text-sm"
        title="Budget residuo diviso per i giocatori ancora mancanti per completare la rosa (portieri inclusi secondo lo slot Portiere configurato). Se la rosa è già completa, mostra l'intero budget residuo."
      >
        <span className="text-slate-500">Valore medio disponibile</span>
        <span className="font-medium">{Math.round(valoreMedioAcquisto)}</span>
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

      {pianoSpesa.length > 0 && (
        <>
          <h3 className="text-xs uppercase text-slate-400 mb-1">Piano di spesa per ruolo residuo</h3>
          <ul className="text-sm space-y-1 mb-4">
            {pianoSpesa.map((v) => (
              <li key={v.ruolo} className="flex items-center justify-between">
                <span
                  className="text-white rounded px-1 text-xs"
                  style={{ backgroundColor: RUOLO_MANTRA_COLORE[v.ruolo] }}
                >
                  {v.ruolo}
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <span
                      className="block h-full"
                      style={{
                        width: `${Math.min(100, (v.quotaBudgetSuggerita / stato.budgetResiduo) * 100)}%`,
                        backgroundColor: RUOLO_MANTRA_COLORE[v.ruolo],
                      }}
                    />
                  </span>
                  <span className="text-slate-400 text-xs">{v.quotaBudgetSuggerita}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="text-xs uppercase text-slate-400 mb-1">Moduli (dal più vicino al completamento)</h3>
      <ul className="text-sm space-y-1">
        {coperture.map((m) => (
          <li key={m.nome} className="relative group">
            <button
              onClick={() => setModuloAperto(moduliByNome.get(m.nome) ?? null)}
              className="w-full flex items-center justify-between hover:bg-slate-50 rounded px-1 -mx-1 py-0.5"
              title={`Vedi ${m.nome} in campo`}
            >
              <span>{m.nome}</span>
              <span className="flex items-center gap-2">
                <span className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <span
                    className={`block h-full ${m.coperti === m.totale ? "bg-green-500" : "bg-amber-400"}`}
                    style={{ width: `${(m.coperti / m.totale) * 100}%` }}
                  />
                </span>
                <span className="text-slate-400 text-xs">
                  {m.coperti}/{m.totale}
                </span>
              </span>
            </button>
            <div className="hidden group-hover:block absolute z-20 left-full top-0 ml-2 w-48 bg-white border border-slate-200 rounded shadow-lg p-2 text-xs space-y-0.5">
              <p className="text-slate-400 uppercase text-[10px] mb-1">{m.nome}</p>
              {(dettagliByNome.get(m.nome) ?? []).map((r) => (
                <div
                  key={r.slot.join("/")}
                  className="flex justify-between items-center"
                >
                  <span className="text-white rounded px-1.5 text-[10px]" style={coloreSfondoSlot(r.slot)}>
                    {r.slot.join("/")}
                  </span>
                  <span className={r.coperti < r.totale ? "text-red-600 font-semibold" : "text-slate-600"}>
                    {r.coperti}/{r.totale}
                  </span>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {moduloAperto && (
        <ModuloVisualizzazione
          modulo={moduloAperto}
          mieiMantra={mieiMantra}
          onClose={() => setModuloAperto(null)}
        />
      )}
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
