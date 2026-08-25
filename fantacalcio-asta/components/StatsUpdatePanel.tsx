"use client";

import { useState } from "react";
import { FpediaStats, FstatsStats } from "@/lib/types";
import { useAuctionStore } from "@/lib/store";

const TOP_N = 200;
const PAUSA_MS = 350;

interface FonteConfig {
  chiave: "fpedia" | "fstats";
  nome: string;
  endpoint: string;
  descrizione: string;
}

const FONTI: FonteConfig[] = [
  {
    chiave: "fpedia",
    nome: "FPEDIA",
    endpoint: "/api/fpedia",
    descrizione: "fantacalciopedia.com (statistiche stagione corrente)",
  },
  {
    chiave: "fstats",
    nome: "FSTATS",
    endpoint: "/api/fstats",
    descrizione: "footystats.org (statistiche stagione precedente)",
  },
];

type Ambito = "tutti" | "top200";
type InCorso = { fonte: FonteConfig["chiave"]; ambito: Ambito } | null;

export function StatsUpdatePanel() {
  const players = useAuctionStore((s) => s.players);
  const applyNewsResults = useAuctionStore((s) => s.applyNewsResults);
  const [inCorso, setInCorso] = useState<InCorso>(null);
  const [progresso, setProgresso] = useState<Record<string, { fatti: number; totale: number; trovati: number }>>({});

  async function aggiornaStatistiche(fonte: FonteConfig, ambito: Ambito) {
    setInCorso({ fonte: fonte.chiave, ambito });
    const target =
      ambito === "tutti" ? players : [...players].sort((a, b) => b.quotazione - a.quotazione).slice(0, TOP_N);
    setProgresso((p) => ({ ...p, [fonte.chiave]: { fatti: 0, totale: target.length, trovati: 0 } }));

    let trovati = 0;
    for (let i = 0; i < target.length; i++) {
      const player = target[i];
      try {
        const res = await fetch(fonte.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: player.nome }),
        });
        const data: { stats: (FpediaStats | FstatsStats) | null; errore?: string } = await res.json();
        if (data.stats) {
          trovati++;
          applyNewsResults({ [player.id]: { [fonte.chiave]: data.stats } });
        }
      } catch {
        // Un giocatore non trovato/fallito non deve interrompere il resto del giro.
      }
      setProgresso((p) => ({ ...p, [fonte.chiave]: { fatti: i + 1, totale: target.length, trovati } }));
      if (i < target.length - 1) await new Promise((r) => setTimeout(r, PAUSA_MS));
    }

    setInCorso(null);
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-3">
      {FONTI.map((fonte) => {
        const prog = progresso[fonte.chiave];
        const attivo = inCorso?.fonte === fonte.chiave;
        return (
          <div key={fonte.chiave} className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => aggiornaStatistiche(fonte, "tutti")}
              disabled={inCorso !== null}
              className="text-sm bg-slate-900 text-white rounded px-3 py-1.5 disabled:opacity-50"
            >
              {attivo && inCorso?.ambito === "tutti"
                ? "Aggiornamento in corso..."
                : `Aggiorna statistiche ${fonte.nome} (tutti)`}
            </button>
            <button
              onClick={() => aggiornaStatistiche(fonte, "top200")}
              disabled={inCorso !== null}
              className="text-sm bg-slate-200 rounded px-3 py-1.5 disabled:opacity-50"
            >
              {attivo && inCorso?.ambito === "top200"
                ? "Aggiornamento in corso..."
                : `Aggiorna statistiche ${fonte.nome} (top ${TOP_N})`}
            </button>

            {attivo && prog && (
              <span className="text-sm text-slate-500">
                {prog.fatti}/{prog.totale} controllati, {prog.trovati} trovati su {fonte.nome}
              </span>
            )}
            {!attivo && prog && prog.totale > 0 && (
              <span className="text-sm text-slate-500">
                Ultimo giro: {prog.trovati}/{prog.totale} trovati su {fonte.nome}
              </span>
            )}
            <span className="text-xs text-slate-400 w-full">
              Una richiesta per giocatore con una breve pausa tra una e l&apos;altra, per non sovraccaricare{" "}
              {fonte.descrizione} — con molti giocatori può richiedere diversi minuti.
            </span>
          </div>
        );
      })}
    </div>
  );
}
