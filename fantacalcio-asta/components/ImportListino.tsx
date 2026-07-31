"use client";

import { useState } from "react";
import { parseListino } from "@/lib/parseListino";
import { useAuctionStore } from "@/lib/store";

export function ImportListino() {
  const players = useAuctionStore((s) => s.players);
  const loadPlayers = useAuctionStore((s) => s.loadPlayers);
  const [errore, setErrore] = useState<string | null>(null);
  const [caricato, setCaricato] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrore(null);
    setCaricato(false);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseListino(buffer);
      if (parsed.length === 0) {
        setErrore("Nessun giocatore trovato nel file. Controlla il formato del listino.");
        return;
      }
      loadPlayers(parsed);
      setCaricato(true);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore durante l'importazione del file.");
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold text-lg mb-2">Importa listino quotazioni</h2>
      <p className="text-sm text-slate-500 mb-3">
        Carica il file Excel/CSV con le quotazioni ufficiali (colonne Ruolo, Nome, Squadra, Qt.A).
      </p>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFile}
        className="text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-900 file:text-white file:px-3 file:py-1.5"
      />
      {errore && <p className="text-red-500 text-sm mt-2">{errore}</p>}
      {caricato && <p className="text-green-600 text-sm mt-2">Listino importato con successo.</p>}
      {players.length > 0 && (
        <p className="text-slate-500 text-sm mt-2">Giocatori attualmente caricati: {players.length}</p>
      )}
    </div>
  );
}
