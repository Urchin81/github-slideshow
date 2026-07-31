"use client";

import { useRef, useState } from "react";
import { parseListino } from "@/lib/parseListino";
import { diffListino, ImportDiff } from "@/lib/mergeListino";
import { Player } from "@/lib/types";
import { useAuctionStore } from "@/lib/store";

export function ImportListino() {
  const players = useAuctionStore((s) => s.players);
  const loadPlayers = useAuctionStore((s) => s.loadPlayers);
  const [errore, setErrore] = useState<string | null>(null);
  const [caricato, setCaricato] = useState(false);
  const [pending, setPending] = useState<{ merged: Player[]; diff: ImportDiff } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrore(null);
    setCaricato(false);
    setPending(null);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseListino(buffer);
      if (parsed.length === 0) {
        setErrore("Nessun giocatore trovato nel file. Controlla il formato del listino.");
        return;
      }

      if (players.length === 0) {
        loadPlayers(parsed);
        setCaricato(true);
        return;
      }

      const { merged, diff } = diffListino(players, parsed);
      setPending({ merged, diff });
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore durante l'importazione del file.");
    }
  }

  function confermaImport() {
    if (!pending) return;
    loadPlayers(pending.merged);
    setPending(null);
    setCaricato(true);
    if (inputRef.current) inputRef.current.value = "";
  }

  function annullaImport() {
    setPending(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const rimossiInRosa = pending?.diff.rimossi.filter((p) => p.stato === "mia") ?? [];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold text-lg mb-2">Importa listino quotazioni</h2>
      <p className="text-sm text-slate-500 mb-3">
        Carica il file Excel/CSV con le quotazioni ufficiali (colonne Ruolo, Nome, Squadra, Qt.A, e
        opzionalmente RM per i ruoli Mantra). Se importi un file dopo il primo, l&apos;app confronta
        i giocatori esistenti: aggiorna i valori cambiati, aggiunge i nuovi e ti chiede conferma prima
        di rimuovere quelli assenti nel nuovo file.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFile}
        className="text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-900 file:text-white file:px-3 file:py-1.5"
      />
      {errore && <p className="text-red-500 text-sm mt-2">{errore}</p>}
      {caricato && <p className="text-green-600 text-sm mt-2">Listino importato con successo.</p>}
      {players.length > 0 && !pending && (
        <p className="text-slate-500 text-sm mt-2">Giocatori attualmente caricati: {players.length}</p>
      )}

      {pending && (
        <div className="mt-4 border border-slate-200 rounded p-3 bg-slate-50">
          <h3 className="font-medium mb-2">Anteprima modifiche</h3>
          <ul className="text-sm space-y-1 mb-3">
            <li>
              <span className="font-semibold text-green-700">{pending.diff.nuovi.length}</span> nuovi
              giocatori
            </li>
            <li>
              <span className="font-semibold text-amber-700">{pending.diff.aggiornati.length}</span>{" "}
              giocatori con valori aggiornati
            </li>
            <li>
              <span className="font-semibold text-slate-500">{pending.diff.invariati}</span> invariati
            </li>
            <li>
              <span className="font-semibold text-red-700">{pending.diff.rimossi.length}</span> giocatori
              non presenti nel nuovo file (verranno rimossi)
            </li>
          </ul>

          {rimossiInRosa.length > 0 && (
            <p className="text-sm bg-red-50 text-red-700 border border-red-200 rounded p-2 mb-3">
              Attenzione: {rimossiInRosa.length} dei giocatori rimossi{" "}
              {rimossiInRosa.length === 1 ? "è già nella tua rosa" : "sono già nella tua rosa"} (
              {rimossiInRosa.map((p) => p.nome).join(", ")}). Confermando, verranno eliminati insieme
              al resto dei dati.
            </p>
          )}

          <div className="flex gap-3">
            <button onClick={confermaImport} className="bg-slate-900 text-white rounded px-4 py-2 text-sm">
              Conferma import
            </button>
            <button onClick={annullaImport} className="text-sm text-slate-500 hover:underline">
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
