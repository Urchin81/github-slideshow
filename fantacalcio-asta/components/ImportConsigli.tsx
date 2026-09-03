"use client";

import { useRef, useState } from "react";
import { abbinaConsigli, parseConsigliCsv } from "@/lib/consigli";
import { useAuctionStore } from "@/lib/store";

// Stesso limite prudenziale di ImportListino/ImportFormazioni: evita che un file enorme blocchi il parsing.
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export function ImportConsigli() {
  const players = useAuctionStore((s) => s.players);
  const applyNewsResults = useAuctionStore((s) => s.applyNewsResults);
  const [errore, setErrore] = useState<string | null>(null);
  const [caricato, setCaricato] = useState<{ voci: number; giocatoriAggiornati: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrore(null);
    setCaricato(null);
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrore(
        `Il file è troppo grande (${Math.round(file.size / 1024 / 1024)} MB, limite ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB).`
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const voci = parseConsigliCsv(buffer);
      if (voci.length === 0) {
        setErrore("Nessun giocatore trovato nel file. Controlla il formato del CSV (colonne Giocatore e Fascia).");
        return;
      }
      const aggiornamenti = abbinaConsigli(players, voci);
      const giocatoriAggiornati = Object.keys(aggiornamenti).length;
      if (giocatoriAggiornati > 0) applyNewsResults(aggiornamenti);
      setCaricato({ voci: voci.length, giocatoriAggiornati });
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore durante l'importazione del file.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-medium mb-1">Consigli fantacalcio (fasce e commenti)</h3>
      <p className="text-sm text-slate-500 mb-2">
        Importa un CSV con le colonne Giocatore, Fascia e Commento (il Ruolo, se presente, viene
        ignorato: l&apos;abbinamento ai giocatori del listino avviene per nome). Aggiorna la
        fascia e il commento mostrati nella scheda giocatore e nel box &quot;in asta&quot;.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFile}
        className="text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-900 file:text-white file:px-3 file:py-1.5"
      />
      {errore && <p className="text-red-500 text-sm mt-2">{errore}</p>}
      {caricato !== null && (
        <p className="text-green-600 text-sm mt-2">
          {caricato.voci} voci lette dal file — {caricato.giocatoriAggiornati} giocatori del listino aggiornati
          (abbinati per nome).
        </p>
      )}
    </div>
  );
}
