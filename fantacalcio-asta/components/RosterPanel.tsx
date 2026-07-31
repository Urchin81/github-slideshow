"use client";

import Link from "next/link";
import { RUOLI, RUOLI_MANTRA, RUOLO_LABEL, RUOLO_MANTRA_LABEL } from "@/lib/types";
import { useAuctionStore } from "@/lib/store";

export function RosterPanel() {
  const players = useAuctionStore((s) => s.players);
  const settings = useAuctionStore((s) => s.settings);
  const resetPlayer = useAuctionStore((s) => s.resetPlayer);
  const mine = players.filter((p) => p.stato === "mia");
  const isMantra = settings.modalita === "mantra";
  const ruoli: string[] = isMantra ? RUOLI_MANTRA : RUOLI;
  const label = (r: string) =>
    isMantra ? RUOLO_MANTRA_LABEL[r as keyof typeof RUOLO_MANTRA_LABEL] : RUOLO_LABEL[r as keyof typeof RUOLO_LABEL];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold text-lg mb-3">La mia rosa ({mine.length})</h2>
      {mine.length === 0 && <p className="text-slate-400 text-sm">Nessun giocatore preso ancora.</p>}
      <div className="space-y-3">
        {ruoli.map((ruolo) => {
          const list = mine.filter((p) => (isMantra ? p.slotRuolo === ruolo : p.ruolo === ruolo));
          if (list.length === 0) return null;
          return (
            <div key={ruolo}>
              <h3 className="text-xs uppercase text-slate-400 mb-1">
                {isMantra ? `${ruolo} · ${label(ruolo)}` : label(ruolo)}
              </h3>
              <ul className="text-sm space-y-1">
                {list.map((p) => (
                  <li key={p.id} className="flex justify-between items-center">
                    <span>
                      <Link href={`/giocatore/${encodeURIComponent(p.id)}`} className="hover:underline">
                        {p.nome}
                      </Link>{" "}
                      <span className="text-slate-400">({p.squadra})</span>
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
