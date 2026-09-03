"use client";

import { useState } from "react";
import { FpediaStats, Player } from "@/lib/types";
import { trovaUrlGiocatoreInIndice, VoceIndiceGiocatore } from "@/lib/indiceGiocatori";
import { BallottaggioGruppoFpedia, risolviBallottaggi } from "@/lib/ballottaggioResolve";
import { useAuctionStore } from "@/lib/store";

// Base fittizia: trovaUrlGiocatoreInIndice ha bisogno di un baseUrl per risolvere
// l'URL della voce trovata, ma qui interessa solo SE c'e' un match, non l'URL.
const BASE_FITTIZIA = "https://fpedia.invalid/";

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
  const [infortuniInCorso, setInfortuniInCorso] = useState(false);
  const [esitoInfortuni, setEsitoInfortuni] = useState<string | null>(null);
  const [ballottaggiInCorso, setBallottaggiInCorso] = useState(false);
  const [esitoBallottaggi, setEsitoBallottaggi] = useState<string | null>(null);

  // Operazione unica e veloce (4 richieste totali, non una per giocatore): recupera
  // i nomi degli infortunati dalle 4 liste per ruolo di FPEDIA e marca/smarca
  // Player.infortunato per l'intera rosa in un solo aggiornamento allo store.
  async function aggiornaInfortunati() {
    setInfortuniInCorso(true);
    setEsitoInfortuni(null);
    try {
      const res = await fetch("/api/fpedia-infortuni");
      const data: { nomi: string[]; errore?: string } = await res.json();
      const indice: VoceIndiceGiocatore[] = data.nomi.map((nome) => ({ nome, url: "#" }));

      const aggiornamenti: Record<string, Partial<Player>> = {};
      let trovati = 0;
      for (const player of players) {
        const infortunato = trovaUrlGiocatoreInIndice(indice, player.nome, BASE_FITTIZIA) !== null;
        if (infortunato) trovati++;
        if (infortunato !== !!player.infortunato) aggiornamenti[player.id] = { infortunato };
      }
      if (Object.keys(aggiornamenti).length > 0) applyNewsResults(aggiornamenti);

      setEsitoInfortuni(
        data.errore && data.nomi.length === 0
          ? `Impossibile recuperare gli infortunati: ${data.errore}`
          : `${trovati} giocatori infortunati trovati e aggiornati.`
      );
    } catch (err) {
      setEsitoInfortuni(`Errore: ${err instanceof Error ? err.message : "richiesta fallita."}`);
    }
    setInfortuniInCorso(false);
  }

  // Operazione unica (una sola pagina, tutte le squadre di Serie A insieme): recupera
  // da FPEDIA i giocatori "Fuoriclasse" e i gruppi di ballottaggio, poi risolve questi
  // ultimi sul listino locale (risolviBallottaggi) e marca/smarca Player.fuoriclasse/
  // Player.ballottaggio per l'intera rosa.
  async function aggiornaBallottaggi() {
    setBallottaggiInCorso(true);
    setEsitoBallottaggi(null);
    try {
      const res = await fetch("/api/fpedia-ballottaggi");
      const data: { fuoriclasse: string[]; ballottaggi: BallottaggioGruppoFpedia[]; errore?: string } =
        await res.json();
      const indiceFuoriclasse: VoceIndiceGiocatore[] = data.fuoriclasse.map((nome) => ({ nome, url: "#" }));
      const ballottaggiRisolti = risolviBallottaggi(players, data.ballottaggi);

      const aggiornamenti: Record<string, Partial<Player>> = {};
      let trovatiFuoriclasse = 0;
      let trovatiBallottaggio = 0;
      for (const player of players) {
        const fuoriclasse = trovaUrlGiocatoreInIndice(indiceFuoriclasse, player.nome, BASE_FITTIZIA) !== null;
        const ballottaggio = ballottaggiRisolti[player.id];
        if (fuoriclasse) trovatiFuoriclasse++;
        if (ballottaggio) trovatiBallottaggio++;
        const partial: Partial<Player> = {};
        if (fuoriclasse !== !!player.fuoriclasse) partial.fuoriclasse = fuoriclasse;
        if (JSON.stringify(ballottaggio) !== JSON.stringify(player.ballottaggio)) partial.ballottaggio = ballottaggio;
        if (Object.keys(partial).length > 0) aggiornamenti[player.id] = partial;
      }
      if (Object.keys(aggiornamenti).length > 0) applyNewsResults(aggiornamenti);

      setEsitoBallottaggi(
        data.errore && data.fuoriclasse.length === 0 && data.ballottaggi.length === 0
          ? `Impossibile recuperare ballottaggi/fuoriclasse: ${data.errore}`
          : `${trovatiFuoriclasse} fuoriclasse e ${trovatiBallottaggio} in ballottaggio trovati e aggiornati.`
      );
    } catch (err) {
      setEsitoBallottaggi(`Errore: ${err instanceof Error ? err.message : "richiesta fallita."}`);
    }
    setBallottaggiInCorso(false);
  }

  /** Vero durante una qualsiasi delle importazioni: disabilita tutti i pulsanti per evitare richieste sovrapposte. */
  const operazioneInCorso = inCorso !== null || infortuniInCorso || ballottaggiInCorso;

  // Un solo pulsante per le tre operazioni "veloci/generali" (infortunati, ballottaggi/
  // fuoriclasse, poi le statistiche FPEDIA per l'intero listino), in sequenza — cosi'
  // non serve premerle una per una. Le prime due sono poche richieste totali e finiscono
  // in fretta; le statistiche FPEDIA restano l'unica a fare una richiesta per giocatore
  // (quindi il passo piu' lento), messa per ultima cosi' i risultati veloci si vedono subito.
  async function aggiornaTutto() {
    if (operazioneInCorso) return;
    await aggiornaInfortunati();
    await aggiornaBallottaggi();
    await aggiornaStatistiche("tutti");
  }

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
      <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-slate-100">
        <button
          onClick={aggiornaTutto}
          disabled={operazioneInCorso}
          className="text-sm bg-emerald-700 text-white rounded px-4 py-2 font-semibold disabled:opacity-50"
          title="Fa tutto in sequenza: infortunati, ballottaggi/fuoriclasse (veloci), poi le statistiche FPEDIA complete — senza premere i pulsanti singolarmente"
        >
          {operazioneInCorso
            ? infortuniInCorso
              ? "⚡ Infortunati..."
              : ballottaggiInCorso
              ? "⚡ Ballottaggi/Fuoriclasse..."
              : `⚡ Statistiche FPEDIA... (${progresso?.fatti ?? 0}/${progresso?.totale ?? 0})`
            : "⚡ Importa tutto"}
        </button>
        <span className="text-xs text-slate-400 w-full">
          Un solo pulsante per infortunati, ballottaggi/fuoriclasse e statistiche FPEDIA (tutti i giocatori) in
          sequenza. Le prime due sono poche richieste e finiscono in fretta; le statistiche FPEDIA restano una
          richiesta per giocatore e possono richiedere diversi minuti — vengono fatte per ultime.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => aggiornaStatistiche("campione")}
          disabled={operazioneInCorso}
          className="text-sm bg-amber-500 text-white rounded px-3 py-1.5 disabled:opacity-50"
          title={`Prova solo su ${CAMPIONE_N} giocatori sparsi nel listino, per verificare che la ricerca funzioni prima di lanciarla su tutti`}
        >
          {inCorso === "campione" ? "Test in corso..." : `Testa FPEDIA su un campione (${CAMPIONE_N})`}
        </button>
        <button
          onClick={() => aggiornaStatistiche("tutti")}
          disabled={operazioneInCorso}
          className="text-sm bg-slate-900 text-white rounded px-3 py-1.5 disabled:opacity-50"
        >
          {inCorso === "tutti" ? "Aggiornamento in corso..." : "Aggiorna statistiche FPEDIA (tutti)"}
        </button>
        <button
          onClick={() => aggiornaStatistiche("top200")}
          disabled={operazioneInCorso}
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

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
        <button
          onClick={aggiornaInfortunati}
          disabled={operazioneInCorso}
          className="text-sm bg-red-600 text-white rounded px-3 py-1.5 disabled:opacity-50"
          title="Legge le 4 liste infortunati di FPEDIA (una per ruolo) e marca/smarca il cerotto rosso su ogni giocatore"
        >
          {infortuniInCorso ? "Aggiornamento in corso..." : "🩹 Aggiorna infortunati"}
        </button>
        {esitoInfortuni && <span className="text-sm text-slate-500">{esitoInfortuni}</span>}
        <span className="text-xs text-slate-400 w-full">
          4 richieste totali (una per ruolo), non una per giocatore: molto più veloce degli
          aggiornamenti sopra. Il cerotto rosso compare su foto e caratteristiche dei giocatori
          infortunati; chi recupera lo perde al giro successivo.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
        <button
          onClick={aggiornaBallottaggi}
          disabled={operazioneInCorso}
          className="text-sm bg-amber-600 text-white rounded px-3 py-1.5 disabled:opacity-50"
          title="Legge la pagina guida-asta di FPEDIA (tutte le squadre) e marca/smarca la corona fuoriclasse e il flag ballottaggio su ogni giocatore"
        >
          {ballottaggiInCorso ? "Aggiornamento in corso..." : "👑 Importa ballottaggi/fuoriclasse"}
        </button>
        {esitoBallottaggi && <span className="text-sm text-slate-500">{esitoBallottaggi}</span>}
        <span className="text-xs text-slate-400 w-full">
          Una sola richiesta (tutte le squadre di Serie A in un&apos;unica pagina). La corona dorata
          compare su foto e simulazione formazione dei giocatori "Fuoriclasse".
        </span>
      </div>
    </div>
  );
}
