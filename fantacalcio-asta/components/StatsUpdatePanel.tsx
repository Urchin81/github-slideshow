"use client";

import { useState } from "react";
import { FpediaStats, Player } from "@/lib/types";
import { useAuctionStore } from "@/lib/store";

const TOP_N = 200;
const CAMPIONE_N = 8;
const PAUSA_MS = 350;

type Ambito = "campione" | "top200" | "tutti";
interface Dettaglio {
  nome: string;
  trovato: boolean;
  errore?: string;
}
interface Progresso {
  ambito: Ambito;
  fatti: number;
  totale: number;
  trovati: number;
  dettagli: Dettaglio[];
}

// Un campione sparso su tutta la lista (per quotazione) invece dei primi N,
// cosi' il test copre anche cognomi comuni/omonimie in fondo al listino.
function estraiCampione<T>(lista: T[], n: number): T[] {
  if (lista.length <= n) return lista;
  const passo = lista.length / n;
  return Array.from({ length: n }, (_, i) => lista[Math.floor(i * passo)]);
}

export function StatsUpdatePanel() {
  const players = useAuctionStore((s) => s.players);
  const applyNewsResults = useAuctionStore((s) => s.applyNewsResults);
  const [inCorso, setInCorso] = useState<Ambito | null>(null);
  const [progresso, setProgresso] = useState<Progresso | null>(null);

  async function aggiornaStatistiche(ambito: Ambito) {
    setInCorso(ambito);
    const perQuotazione = [...players].sort((a, b) => b.quotazione - a.quotazione);
    const target: Player[] =
      ambito === "tutti" ? perQuotazione : ambito === "top200" ? perQuotazione.slice(0, TOP_N) : estraiCampione(perQuotazione, CAMPIONE_N);
    setProgresso({ ambito, fatti: 0, totale: target.length, trovati: 0, dettagli: [] });

    let trovati = 0;
    const dettagli: Dettaglio[] = [];
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
          dettagli.push({ nome: player.nome, trovato: true });
        } else {
          dettagli.push({ nome: player.nome, trovato: false, errore: data.errore ?? "Non trovato." });
        }
      } catch (err) {
        dettagli.push({
          nome: player.nome,
          trovato: false,
          errore: err instanceof Error ? err.message : "Errore di rete.",
        });
      }
      setProgresso({ ambito, fatti: i + 1, totale: target.length, trovati, dettagli: [...dettagli] });
      if (i < target.length - 1) await new Promise((r) => setTimeout(r, PAUSA_MS));
    }

    setInCorso(null);
  }

  const righe = progresso
    ? progresso.ambito === "campione"
      ? progresso.dettagli
      : progresso.dettagli.filter((d) => !d.trovato)
    : [];
  const righeMostrate = righe.slice(0, 30);

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => aggiornaStatistiche("campione")}
          disabled={inCorso !== null}
          className="text-sm bg-amber-500 text-white rounded px-3 py-1.5 disabled:opacity-50"
          title={`Prova solo su ${CAMPIONE_N} giocatori sparsi nel listino, per verificare che la ricerca funzioni prima di lanciarla su tutti`}
        >
          {inCorso === "campione" ? "Test in corso..." : `Testa FPEDIA su un campione (${CAMPIONE_N})`}
        </button>
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

        {inCorso !== null && progresso && (
          <span className="text-sm text-slate-500">
            {progresso.fatti}/{progresso.totale} controllati, {progresso.trovati} trovati su FPEDIA
          </span>
        )}
        {inCorso === null && progresso && progresso.totale > 0 && (
          <span className="text-sm text-slate-500">
            Ultimo giro: {progresso.trovati}/{progresso.totale} trovati su FPEDIA
          </span>
        )}
        <span className="text-xs text-slate-400 w-full">
          Una richiesta per giocatore con una breve pausa tra una e l&apos;altra, per non sovraccaricare
          fantacalciopedia.com — con molti giocatori può richiedere diversi minuti. Prima di lanciarlo su tutti, usa
          il pulsante di test per verificare che la ricerca trovi davvero i giocatori.
        </span>
      </div>

      {inCorso === null && progresso && righe.length > 0 && (
        <div className="w-full text-xs border border-slate-100 rounded overflow-hidden">
          {progresso.ambito !== "campione" && (
            <div className="px-2 py-1 bg-slate-50 text-slate-500">
              {`${righe.length} non trovati${righe.length > 30 ? " (primi 30 mostrati)" : ""}:`}
            </div>
          )}
          <table className="w-full">
            <tbody>
              {righeMostrate.map((d, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="py-1 px-2">{d.trovato ? "✅" : "❌"}</td>
                  <td className="py-1 px-2 font-medium">{d.nome}</td>
                  <td className="py-1 px-2 text-slate-400">{d.errore ?? "Trovato"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
