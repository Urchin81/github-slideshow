"use client";

import { useState } from "react";
import { matchNews } from "@/lib/matchNews";
import { useAuctionStore } from "@/lib/store";
import type { NewsFeedError, RawNewsItem } from "@/app/api/news/route";

const TOP_N = 200;

export function NewsUpdatePanel() {
  const players = useAuctionStore((s) => s.players);
  const applyNewsResults = useAuctionStore((s) => s.applyNewsResults);
  const [inCorso, setInCorso] = useState<"tutti" | "top200" | null>(null);
  const [risultato, setRisultato] = useState<{ aggiornati: number; totale: number; errori: NewsFeedError[] } | null>(
    null
  );
  const [errore, setErrore] = useState<string | null>(null);

  async function aggiornaNotizie(ambito: "tutti" | "top200") {
    setInCorso(ambito);
    setErrore(null);
    setRisultato(null);
    try {
      const targetPlayers =
        ambito === "tutti"
          ? players
          : [...players].sort((a, b) => b.quotazione - a.quotazione).slice(0, TOP_N);

      const res = await fetch("/api/news", { method: "POST" });
      if (!res.ok) throw new Error(`Richiesta fallita (${res.status})`);
      const data: { items: RawNewsItem[]; errori: NewsFeedError[] } = await res.json();

      const updates = matchNews(targetPlayers, data.items);
      applyNewsResults(updates);

      setRisultato({
        aggiornati: Object.keys(updates).length,
        totale: targetPlayers.length,
        errori: data.errori,
      });
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore durante l'aggiornamento notizie.");
    } finally {
      setInCorso(null);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center gap-3">
      <button
        onClick={() => aggiornaNotizie("tutti")}
        disabled={inCorso !== null}
        className="text-sm bg-slate-900 text-white rounded px-3 py-1.5 disabled:opacity-50"
      >
        {inCorso === "tutti" ? "Aggiornamento in corso..." : "Aggiorna notizie (tutti i giocatori)"}
      </button>
      <button
        onClick={() => aggiornaNotizie("top200")}
        disabled={inCorso !== null}
        className="text-sm bg-slate-200 rounded px-3 py-1.5 disabled:opacity-50"
      >
        {inCorso === "top200" ? "Aggiornamento in corso..." : `Aggiorna notizie (top ${TOP_N} per valore)`}
      </button>

      {risultato && (
        <span className="text-sm text-slate-500">
          Trovate notizie per {risultato.aggiornati}/{risultato.totale} giocatori.
          {risultato.errori.length > 0 && (
            <span className="text-amber-600">
              {" "}
              Feed non raggiungibili: {risultato.errori.map((e) => e.feed).join(", ")}.
            </span>
          )}
        </span>
      )}
      {errore && <span className="text-sm text-red-500">{errore}</span>}
    </div>
  );
}
