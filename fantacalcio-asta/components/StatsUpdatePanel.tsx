"use client";

import { useState } from "react";
import { FpediaStats } from "@/lib/types";
import { useAuctionStore } from "@/lib/store";

const TOP_N = 200;
const PAUSA_MS = 350;

export function StatsUpdatePanel() {
  const players = useAuctionStore((s) => s.players);
  const applyNewsResults = useAuctionStore((s) => s.applyNewsResults);
  const [inCorso, setInCorso] = useState<"tutti" | "top200" | null>(null);
  const [progresso, setProgresso] = useState({ fatti: 0, totale: 0, trovati: 0 });
  const [errore, setErrore] = useState<string | null>(null);

  async function aggiornaStatistiche(ambito: "tutti" | "top200") {
    setInCorso(ambito);
    setErrore(null);
    const target =
      ambito === "tutti" ? players : [...players].sort((a, b) => b.quotazione - a.quotazione).slice(0, TOP_N);
    setProgresso({ fatti: 0, totale: target.length, trovati: 0 });

    let trovati = 0;
    for (let i = 0; i < target.length; i++) {
      const player = target[i];
      try {
        const res = await fetch("/api/fpedia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: player.nome }),
        });
        const data: { stats: FpediaStats | null; errore?: string } = await res.json();
        if (data.stats) {
          trovati++;
          applyNewsResults({ [player.id]: { fpedia: data.stats } });
        }
      } catch {
        // Un giocatore non trovato/fallito non deve interrompere il resto del giro.
      }
      setProgresso({ fatti: i + 1, totale: target.length, trovati });
      if (i < target.length - 1) await new Promise((r) => setTimeout(r, PAUSA_MS));
    }

    setInCorso(null);
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center gap-3">
      <button
        onClick={() => aggiornaStatistiche("tutti")}
        disabled={inCorso !== null}
        className="text-sm bg-slate-900 text-white rounded px-3 py-1.5 disabled:opacity-50"
      >
        {inCorso === "tutti" ? "Aggiornamento in corso..." : "Aggiorna statistiche FPEDIA (tutti)"}
      </button>
      <button
        onClick={() => aggiornaStatistiche("top200")}
        disabled={inCorso !== null}
        className="text-sm bg-slate-200 rounded px-3 py-1.5 disabled:opacity-50"
      >
        {inCorso === "top200" ? "Aggiornamento in corso..." : `Aggiorna statistiche FPEDIA (top ${TOP_N})`}
      </button>

      {inCorso !== null && (
        <span className="text-sm text-slate-500">
          {progresso.fatti}/{progresso.totale} controllati, {progresso.trovati} trovati su FPEDIA
        </span>
      )}
      {inCorso === null && progresso.totale > 0 && (
        <span className="text-sm text-slate-500">
          Ultimo giro: {progresso.trovati}/{progresso.totale} trovati su FPEDIA
        </span>
      )}
      {errore && <span className="text-sm text-red-500">{errore}</span>}
      <span className="text-xs text-slate-400 w-full">
        Una richiesta per giocatore con una breve pausa tra una e l&apos;altra, per non sovraccaricare
        fantacalciopedia.com — con molti giocatori può richiedere diversi minuti.
      </span>
    </div>
  );
}
