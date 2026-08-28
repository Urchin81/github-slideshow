"use client";

import { useEffect, useState } from "react";
import {
  GRUPPI_BUDGET_MANTRA,
  GRUPPO_BUDGET_MANTRA_COLORE,
  GRUPPO_BUDGET_MANTRA_LABEL,
  PERCENTUALE_BUDGET_GRUPPI_STRATEGIA,
  RUOLI,
  RUOLO_LABEL,
  Settings,
  STRATEGIA_BUDGET_MANTRA_LABEL,
  STRATEGIE_BUDGET_MANTRA,
  StrategiaBudgetMantra,
} from "@/lib/types";
import { useAuctionStore } from "@/lib/store";
import { PreferitiGruppoMantra } from "./PreferitiGruppoMantra";

type RigaConfronto =
  | { etichetta: string; tipo: "stelle"; valori: Record<StrategiaBudgetMantra, number> }
  | { etichetta: string; tipo: "rischio"; valori: Record<StrategiaBudgetMantra, "Basso" | "Medio" | "Alto"> };

// Confronto tra le 3 strategie di budget suggerite dall'utente, riportato così com'è.
const CONFRONTO_STRATEGIE: RigaConfronto[] = [
  { etichetta: "Titolarità", tipo: "stelle", valori: { conservativa: 5, bilanciata: 4.5, aggressiva: 3 } },
  { etichetta: "Bonus potenziali", tipo: "stelle", valori: { conservativa: 3, bilanciata: 4.5, aggressiva: 5 } },
  { etichetta: "Flessibilità Mantra", tipo: "stelle", valori: { conservativa: 4, bilanciata: 5, aggressiva: 4 } },
  { etichetta: "Rischio asta", tipo: "rischio", valori: { conservativa: "Basso", bilanciata: "Medio", aggressiva: "Alto" } },
  {
    etichetta: "Rischio infortuni",
    tipo: "rischio",
    valori: { conservativa: "Basso", bilanciata: "Medio", aggressiva: "Alto" },
  },
  {
    etichetta: "Capacità di cogliere value",
    tipo: "stelle",
    valori: { conservativa: 3, bilanciata: 5, aggressiva: 3 },
  },
  { etichetta: "Adatta a 12", tipo: "stelle", valori: { conservativa: 4, bilanciata: 5, aggressiva: 3 } },
];

function Stelle({ valore }: { valore: number }) {
  const piene = Math.floor(valore);
  const mezza = valore - piene >= 0.5;
  return (
    <span className="text-amber-400 whitespace-nowrap" title={`${valore}/5`}>
      {"★".repeat(piene)}
      {mezza && <span className="text-[10px] align-top">½</span>}
    </span>
  );
}

function Rischio({ livello }: { livello: "Basso" | "Medio" | "Alto" }) {
  const colore = livello === "Basso" ? "text-green-600" : livello === "Medio" ? "text-amber-600" : "text-red-600";
  return <span className={`${colore} font-medium`}>{livello}</span>;
}

export function SettingsForm() {
  const settings = useAuctionStore((s) => s.settings);
  const setSettings = useAuctionStore((s) => s.setSettings);
  const resetAll = useAuctionStore((s) => s.resetAll);
  const [local, setLocal] = useState<Settings>(settings);
  const [salvato, setSalvato] = useState(false);

  // Il settings dello store viene idratato da localStorage dopo il primo render:
  // risincronizza il form quando arriva lo stato persistito.
  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  const totalePercentualeClassic = RUOLI.reduce((sum, r) => sum + local.ruoli[r].percentualeBudget, 0);
  const totalePercentualeMantra = GRUPPI_BUDGET_MANTRA.reduce(
    (sum, g) => sum + (local.mantra.percentualeBudgetGruppi[g] ?? 0),
    0
  );

  function handleSave() {
    setSettings(local);
    setSalvato(true);
    setTimeout(() => setSalvato(false), 2000);
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold text-lg mb-3">Configurazione asta</h2>

      <label className="block text-sm mb-4">
        Modalità
        <select
          value={local.modalita}
          onChange={(e) => setLocal({ ...local, modalita: e.target.value as Settings["modalita"] })}
          className="block mt-1 border border-slate-200 rounded px-3 py-1.5 w-40"
        >
          <option value="classic">Classic</option>
          <option value="mantra">Mantra</option>
        </select>
      </label>

      <label className="block text-sm mb-4">
        Budget totale
        <input
          type="number"
          min={1}
          value={local.budgetTotale}
          onChange={(e) => setLocal({ ...local, budgetTotale: Number(e.target.value) || 0 })}
          className="block mt-1 border border-slate-200 rounded px-3 py-1.5 w-40"
        />
      </label>

      <label className="block text-sm mb-4">
        Numero di partecipanti all&apos;asta
        <input
          type="number"
          min={2}
          value={local.numeroPartecipanti}
          onChange={(e) => setLocal({ ...local, numeroPartecipanti: Number(e.target.value) || 0 })}
          className="block mt-1 border border-slate-200 rounded px-3 py-1.5 w-40"
        />
        <span className="block text-xs text-slate-400 mt-1">
          Quante squadre (te incluso) si spartiscono i giocatori: serve per avvisarti quando i titolari
          di un ruolo cominciano a scarseggiare sul mercato.
        </span>
      </label>

      {local.modalita === "classic" ? (
        <>
          <table className="w-full text-sm mb-2">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-1">Ruolo</th>
                <th className="pb-1">Slot in rosa</th>
                <th className="pb-1">% budget</th>
              </tr>
            </thead>
            <tbody>
              {RUOLI.map((ruolo) => (
                <tr key={ruolo}>
                  <td className="py-1">{RUOLO_LABEL[ruolo]}</td>
                  <td className="py-1">
                    <input
                      type="number"
                      min={0}
                      value={local.ruoli[ruolo].slot}
                      onChange={(e) =>
                        setLocal({
                          ...local,
                          ruoli: {
                            ...local.ruoli,
                            [ruolo]: { ...local.ruoli[ruolo], slot: Number(e.target.value) || 0 },
                          },
                        })
                      }
                      className="border border-slate-200 rounded px-2 py-1 w-20"
                    />
                  </td>
                  <td className="py-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={local.ruoli[ruolo].percentualeBudget}
                      onChange={(e) =>
                        setLocal({
                          ...local,
                          ruoli: {
                            ...local.ruoli,
                            [ruolo]: {
                              ...local.ruoli[ruolo],
                              percentualeBudget: Number(e.target.value) || 0,
                            },
                          },
                        })
                      }
                      className="border border-slate-200 rounded px-2 py-1 w-20"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p
            className={`text-xs mb-4 ${
              totalePercentualeClassic === 100 ? "text-slate-400" : "text-amber-600"
            }`}
          >
            Totale percentuali: {totalePercentualeClassic}%{" "}
            {totalePercentualeClassic !== 100 && "(consigliato: 100%)"}
          </p>
        </>
      ) : (
        <div className="mb-4">
          <p className="text-sm text-slate-500 mb-3">
            In Mantra non ci sono slot fissi per ruolo: puoi prendere tutti i giocatori che vuoi in ogni
            ruolo. Imposta solo quanti giocatori totali vuoi/puoi acquistare; l&apos;app userà budget
            residuo e posti rimanenti per calcolare quanto spendere in media e quali ruoli servono di più
            in base ai moduli tattici.
          </p>
          <div className="flex gap-4">
            <label className="block text-sm">
              Numero minimo di giocatori
              <input
                type="number"
                min={1}
                value={local.mantra.minGiocatori}
                onChange={(e) =>
                  setLocal({
                    ...local,
                    mantra: { ...local.mantra, minGiocatori: Number(e.target.value) || 0 },
                  })
                }
                className="block mt-1 border border-slate-200 rounded px-3 py-1.5 w-32"
              />
            </label>
            <label className="block text-sm">
              Numero massimo di giocatori
              <input
                type="number"
                min={1}
                value={local.mantra.maxGiocatori}
                onChange={(e) =>
                  setLocal({
                    ...local,
                    mantra: { ...local.mantra, maxGiocatori: Number(e.target.value) || 0 },
                  })
                }
                className="block mt-1 border border-slate-200 rounded px-3 py-1.5 w-32"
              />
            </label>
          </div>
          {local.mantra.minGiocatori > local.mantra.maxGiocatori && (
            <p className="text-xs text-amber-600 mt-2">Il minimo non dovrebbe superare il massimo.</p>
          )}

          <h3 className="text-sm font-medium mt-4 mb-1">Budget per gruppo di ruoli</h3>
          <p className="text-xs text-slate-500 mb-2">
            In Mantra il budget non si pianifica per singolo ruolo ma per questi gruppi, in percentuale del
            budget totale (usati nel pannello Budget, in crediti, per mostrare quanto hai speso rispetto al
            previsto — cambiando il budget totale cambia anche il valore in crediti). &quot;Riserva&quot; è
            una quota libera, non legata a un ruolo.
          </p>

          <div className="overflow-x-auto mb-3">
            <table className="text-xs mb-2 min-w-full">
              <thead>
                <tr className="text-slate-400">
                  <th className="text-left pb-1 font-normal"></th>
                  {STRATEGIE_BUDGET_MANTRA.map((s) => (
                    <th key={s} className="text-center pb-1 px-2 font-semibold text-slate-600 whitespace-nowrap">
                      {STRATEGIA_BUDGET_MANTRA_LABEL[s]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CONFRONTO_STRATEGIE.map((riga) => (
                  <tr key={riga.etichetta} className="border-t border-slate-100">
                    <td className="py-1 pr-2 text-slate-500 whitespace-nowrap">{riga.etichetta}</td>
                    {STRATEGIE_BUDGET_MANTRA.map((s) => (
                      <td key={s} className="py-1 px-2 text-center">
                        {riga.tipo === "stelle" ? (
                          <Stelle valore={riga.valori[s]} />
                        ) : (
                          <Rischio livello={riga.valori[s]} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {STRATEGIE_BUDGET_MANTRA.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() =>
                  setLocal({
                    ...local,
                    mantra: {
                      ...local.mantra,
                      percentualeBudgetGruppi: { ...PERCENTUALE_BUDGET_GRUPPI_STRATEGIA[s] },
                    },
                  })
                }
                className="text-sm border border-slate-300 rounded px-3 py-1.5 hover:bg-slate-50"
              >
                {STRATEGIA_BUDGET_MANTRA_LABEL[s]}
                {s === "bilanciata" && (
                  <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 rounded px-1 py-0.5 align-middle">
                    consigliata
                  </span>
                )}
              </button>
            ))}
          </div>

          {GRUPPI_BUDGET_MANTRA.map((gruppo) => {
            const percentuale = local.mantra.percentualeBudgetGruppi[gruppo];
            const crediti = Math.round((local.budgetTotale * percentuale) / 100);
            return (
              <div key={gruppo} className="border border-slate-200 rounded-lg p-2.5 mb-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-white rounded px-1.5 text-xs shrink-0"
                    style={{ backgroundColor: GRUPPO_BUDGET_MANTRA_COLORE[gruppo] }}
                  >
                    {GRUPPO_BUDGET_MANTRA_LABEL[gruppo]}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={percentuale}
                      onChange={(e) =>
                        setLocal({
                          ...local,
                          mantra: {
                            ...local.mantra,
                            percentualeBudgetGruppi: {
                              ...local.mantra.percentualeBudgetGruppi,
                              [gruppo]: Number(e.target.value) || 0,
                            },
                          },
                        })
                      }
                      className="border border-slate-200 rounded px-2 py-1 w-20 text-right"
                    />
                    <span className="text-xs text-slate-400">%</span>
                    <span className="text-xs text-slate-500 w-20 text-right">≈ {crediti} cr.</span>
                  </div>
                </div>
                {gruppo !== "Riserva" && <PreferitiGruppoMantra gruppo={gruppo} />}
              </div>
            );
          })}

          <p
            className={`text-xs ${Math.abs(totalePercentualeMantra - 100) < 0.5 ? "text-slate-400" : "text-amber-600"}`}
          >
            Totale percentuali: {Math.round(totalePercentualeMantra * 100) / 100}%{" "}
            {Math.abs(totalePercentualeMantra - 100) >= 0.5 && "(consigliato: 100%)"}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={handleSave} className="bg-slate-900 text-white rounded px-4 py-2 text-sm">
          Salva configurazione
        </button>
        {salvato && <span className="text-green-600 text-sm">Salvato ✓</span>}
      </div>

      <hr className="my-4 border-slate-100" />

      <button
        onClick={() => {
          if (confirm("Azzerare tutti i giocatori assegnati (mia squadra e prese da altri)?")) {
            resetAll();
          }
        }}
        className="text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-1.5 hover:bg-red-100"
      >
        Azzera asta (mantiene il listino importato)
      </button>
    </div>
  );
}
