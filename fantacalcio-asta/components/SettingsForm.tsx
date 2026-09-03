"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import {
  GRUPPI_BUDGET_MANTRA,
  GRUPPO_BUDGET_MANTRA_COLORE,
  GRUPPO_BUDGET_MANTRA_LABEL,
  GruppoBudgetMantra,
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

function PopupConfrontoStrategie({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Confronto strategie di budget</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none px-1">
            ✕
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="text-xs min-w-full">
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
                      {riga.tipo === "stelle" ? <Stelle valore={riga.valori[s]} /> : <Rischio livello={riga.valori[s]} />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Percentuali coincidenti (a meno di errori di arrotondamento) con una delle 3 strategie predefinite, se ce n'è una. */
function trovaStrategiaAttiva(percentuali: Record<GruppoBudgetMantra, number>): StrategiaBudgetMantra | null {
  return (
    STRATEGIE_BUDGET_MANTRA.find((s) =>
      GRUPPI_BUDGET_MANTRA.every((g) => Math.abs(percentuali[g] - PERCENTUALE_BUDGET_GRUPPI_STRATEGIA[s][g]) < 0.01)
    ) ?? null
  );
}

export function SettingsForm() {
  const settings = useAuctionStore((s) => s.settings);
  const setSettings = useAuctionStore((s) => s.setSettings);
  const resetAll = useAuctionStore((s) => s.resetAll);
  const [local, setLocal] = useState<Settings>(settings);
  const [salvato, setSalvato] = useState(false);
  const [dettaglioEspanso, setDettaglioEspanso] = useState(false);
  const [popupAperto, setPopupAperto] = useState(false);

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
  const strategiaAttiva = useMemo(
    () => trovaStrategiaAttiva(local.mantra.percentualeBudgetGruppi),
    [local.mantra.percentualeBudgetGruppi]
  );

  function handleSave() {
    setSettings(local);
    setSalvato(true);
    setTimeout(() => setSalvato(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-lg mb-3">Configurazione asta</h2>

        <div className="flex flex-wrap gap-4 mb-4">
          <label className="text-sm">
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

          <label className="text-sm">
            Budget totale
            <input
              type="number"
              min={1}
              value={local.budgetTotale}
              onChange={(e) => setLocal({ ...local, budgetTotale: Number(e.target.value) || 0 })}
              className="block mt-1 border border-slate-200 rounded px-3 py-1.5 w-32"
            />
          </label>

          <label className="text-sm flex-1 min-w-[220px]">
            Numero di partecipanti all&apos;asta
            <input
              type="number"
              min={2}
              value={local.numeroPartecipanti}
              onChange={(e) => setLocal({ ...local, numeroPartecipanti: Number(e.target.value) || 0 })}
              className="block mt-1 border border-slate-200 rounded px-3 py-1.5 w-32"
            />
          </label>
        </div>
        <p className="text-xs text-slate-400 -mt-3 mb-4">
          Quante squadre (te incluso) si spartiscono i giocatori: serve per avvisarti quando i titolari di un
          ruolo cominciano a scarseggiare sul mercato.
        </p>

        {local.modalita === "mantra" && (
          <div>
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
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">
            {local.modalita === "classic" ? "Budget per ruolo" : "Budget per gruppo di ruoli"}
          </h2>
          <button
            type="button"
            onClick={() => setDettaglioEspanso((v) => !v)}
            title={dettaglioEspanso ? "Comprimi" : "Espandi"}
            className="text-slate-400 hover:text-slate-600"
          >
            {dettaglioEspanso ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {local.modalita === "mantra" && (
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              {STRATEGIE_BUDGET_MANTRA.map((s) => {
                const attiva = strategiaAttiva === s;
                return (
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
                    className={`text-sm rounded px-3 py-1.5 border transition-colors ${
                      attiva
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {STRATEGIA_BUDGET_MANTRA_LABEL[s]}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setPopupAperto(true)}
                title="Confronta le tre strategie"
                className="w-7 h-7 flex items-center justify-center rounded-full border border-slate-300 text-slate-500 hover:bg-slate-50 shrink-0"
              >
                <Info size={14} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Strategia:{" "}
              {strategiaAttiva ? (
                <strong>{STRATEGIA_BUDGET_MANTRA_LABEL[strategiaAttiva]}</strong>
              ) : (
                <span className="italic">Personalizzata</span>
              )}
            </p>
          </div>
        )}

        {dettaglioEspanso && (
          <div className="mt-3">
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
                <p className={`text-xs ${totalePercentualeClassic === 100 ? "text-slate-400" : "text-amber-600"}`}>
                  Totale percentuali: {totalePercentualeClassic}%{" "}
                  {totalePercentualeClassic !== 100 && "(consigliato: 100%)"}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-500 mb-2">
                  In Mantra il budget non si pianifica per singolo ruolo ma per questi gruppi, in percentuale
                  del budget totale (usati nel pannello Budget, in crediti, per mostrare quanto hai speso
                  rispetto al previsto — cambiando il budget totale cambia anche il valore in crediti).
                  &quot;Riserva&quot; è una quota libera, non legata a un ruolo.
                </p>

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
                  className={`text-xs ${
                    Math.abs(totalePercentualeMantra - 100) < 0.5 ? "text-slate-400" : "text-amber-600"
                  }`}
                >
                  Totale percentuali: {Math.round(totalePercentualeMantra * 100) / 100}%{" "}
                  {Math.abs(totalePercentualeMantra - 100) >= 0.5 && "(consigliato: 100%)"}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
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

      {popupAperto && <PopupConfrontoStrategie onClose={() => setPopupAperto(false)} />}
    </div>
  );
}
