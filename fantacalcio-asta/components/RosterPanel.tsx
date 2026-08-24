"use client";

import Link from "next/link";
import { RUOLI, RUOLO_LABEL } from "@/lib/types";
import { useAuctionStore } from "@/lib/store";

function RigaGiocatore({ id, nome, squadra, prezzoPagato, extra }: { id: string; nome: string; squadra: string; prezzoPagato?: number; extra?: React.ReactNode }) {
  const resetPlayer = useAuctionStore((s) => s.resetPlayer);
  return (
    <li className="flex justify-between items-center">
      <span>
        <Link href={`/giocatore/${encodeURIComponent(id)}`} className="hover:underline">
          {nome}
        </Link>{" "}
        <span className="text-slate-400">({squadra})</span>
        {extra}
      </span>
      <span className="flex items-center gap-2">
        <span className="font-medium">{prezzoPagato}</span>
        <button onClick={() => resetPlayer(id)} className="text-xs text-red-500 hover:underline" title="Annulla acquisto">
          annulla
        </button>
      </span>
    </li>
  );
}

function RosterClassic() {
  const players = useAuctionStore((s) => s.players);
  const mine = players.filter((p) => p.stato === "mia");

  return (
    <div className="space-y-3">
      {RUOLI.map((ruolo) => {
        const list = mine.filter((p) => p.ruolo === ruolo);
        if (list.length === 0) return null;
        return (
          <div key={ruolo}>
            <h3 className="text-xs uppercase text-slate-400 mb-1">{RUOLO_LABEL[ruolo]}</h3>
            <ul className="text-sm space-y-1">
              {list.map((p) => (
                <RigaGiocatore key={p.id} id={p.id} nome={p.nome} squadra={p.squadra} prezzoPagato={p.prezzoPagato} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function RosterMantra() {
  const players = useAuctionStore((s) => s.players);
  const mine = [...players.filter((p) => p.stato === "mia")].sort((a, b) => b.quotazione - a.quotazione);

  return (
    <ul className="text-sm space-y-1">
      {mine.map((p) => (
        <RigaGiocatore
          key={p.id}
          id={p.id}
          nome={p.nome}
          squadra={p.squadra}
          prezzoPagato={p.prezzoPagato}
          extra={
            <span className="ml-1">
              {(p.ruoliMantra ?? []).map((r) => (
                <span key={r} className="text-[10px] bg-slate-100 rounded px-1 mr-0.5">
                  {r}
                </span>
              ))}
            </span>
          }
        />
      ))}
    </ul>
  );
}

export function RosterPanel() {
  const players = useAuctionStore((s) => s.players);
  const settings = useAuctionStore((s) => s.settings);
  const mine = players.filter((p) => p.stato === "mia");

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold text-lg mb-3">La mia rosa ({mine.length})</h2>
      {mine.length === 0 && <p className="text-slate-400 text-sm">Nessun giocatore preso ancora.</p>}
      {settings.modalita === "classic" ? <RosterClassic /> : <RosterMantra />}
    </div>
  );
}
