"use client";

import { useMemo, useState } from "react";
import { GruppoBudgetMantra, gruppoBudgetMantraGiocatore, normalizeText } from "@/lib/types";
import { useAuctionStore } from "@/lib/store";

/**
 * Ricerca con suggerimenti + elenco preferiti per un gruppo di budget Mantra,
 * nella schermata Settings: selezionare un suggerimento aggiunge il
 * giocatore ai preferiti (stessa stellina di PlayerTable/RosterPanel,
 * lib/store.ts toggleFavorite) — e viceversa, un giocatore reso preferito
 * dalla tabella compare qui automaticamente (nessuno stato locale duplicato,
 * solo un filtro sui players dello store), rimovibile con la "×".
 */
export function PreferitiGruppoMantra({ gruppo }: { gruppo: Exclude<GruppoBudgetMantra, "Riserva"> }) {
  const players = useAuctionStore((s) => s.players);
  const toggleFavorite = useAuctionStore((s) => s.toggleFavorite);
  const [testo, setTesto] = useState("");

  const giocatoriGruppo = useMemo(
    () => players.filter((p) => gruppoBudgetMantraGiocatore(p.ruoliMantra) === gruppo),
    [players, gruppo]
  );
  const preferiti = giocatoriGruppo.filter((p) => p.preferito);

  const suggerimenti = useMemo(() => {
    const t = normalizeText(testo);
    if (t.length === 0) return [];
    return giocatoriGruppo.filter((p) => !p.preferito && normalizeText(p.nome).includes(t)).slice(0, 8);
  }, [testo, giocatoriGruppo]);

  return (
    <div className="mt-1.5">
      <div className="relative">
        <input
          type="text"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder="Aggiungi un preferito per questo gruppo..."
          className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
        />
        {suggerimenti.length > 0 && (
          <ul className="absolute z-10 left-0 right-0 mt-0.5 bg-white border border-slate-200 rounded shadow-lg max-h-40 overflow-auto text-xs">
            {suggerimenti.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    toggleFavorite(p.id);
                    setTesto("");
                  }}
                  className="w-full text-left px-2 py-1 hover:bg-slate-50"
                >
                  {p.nome} <span className="text-slate-400">({p.squadra})</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {preferiti.length > 0 && (
        <ul className="flex flex-wrap gap-1 mt-1.5">
          {preferiti.map((p) => (
            <li
              key={p.id}
              className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full pl-2 pr-1 py-0.5 text-xs"
            >
              {p.nome}
              <button
                type="button"
                onClick={() => toggleFavorite(p.id)}
                title="Rimuovi dai preferiti"
                className="text-amber-500 hover:text-amber-700 leading-none"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
