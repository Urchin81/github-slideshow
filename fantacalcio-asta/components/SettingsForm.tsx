"use client";

import { useEffect, useState } from "react";
import { RUOLI, RUOLO_LABEL, Settings } from "@/lib/types";
import { useAuctionStore } from "@/lib/store";

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
