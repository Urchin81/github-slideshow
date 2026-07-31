"use client";

import { RUOLI, RUOLO_LABEL } from "@/lib/types";
import { useAuctionStore } from "@/lib/store";

export function RosterPanel() {
  const players = useAuctionStore((s) => s.players);
  const resetPlayer = useAuctionStore((s) => s.resetPlayer);
  const mine = players.filter((p) => p.stato === "mia");

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold text-lg mb-3">La mia rosa ({mine.length})</h2>
      {mine.length === 0 && <p className="text-slate-400 text-sm">Nessun giocatore preso ancora.</p>}
      <div className="space-y-3">
        {RUOLI.map((ruolo) => {
          const list = mine.filter((p) => p.ruolo === ruolo);
          if (list.length === 0) return null;
          return (
            <div key={ruolo}>
              <h3 className="text-xs uppercase text-slate-400 mb-1">{RUOLO_LABEL[ruolo]}</h3>
              <ul className="text-sm space-y-1">
                {list.map((p) => (
                  <li key={p.id} className="flex justify-between items-center">
                    <span>
                      {p.nome} <span className="text-slate-400">({p.squadra})</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{p.prezzoPagato}</span>
                      <button
                        onClick={() => resetPlayer(p.id)}
                        className="text-xs text-red-500 hover:underline"
                        title="Annulla acquisto"
                      >
                        annulla
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
