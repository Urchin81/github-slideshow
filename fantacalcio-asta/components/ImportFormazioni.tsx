"use client";

import { useRef, useState } from "react";
import { parseFormazioniCsv } from "@/lib/formazioni";
import { useAuctionStore } from "@/lib/store";

// Stesso limite prudenziale di ImportListino: evita che un file enorme blocchi il parsing.
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export function ImportFormazioni() {
  const formazioni = useAuctionStore((s) => s.formazioni);
  const setFormazioni = useAuctionStore((s) => s.setFormazioni);
  const [errore, setErrore] = useState<string | null>(null);
  const [caricato, setCaricato] = useState<number | null>(null);
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
      const parsed = parseFormazioniCsv(buffer);
      if (parsed.length === 0) {
        setErrore("Nessuna squadra trovata nel file. Controlla il formato del CSV.");
        return;
      }
      if (
        formazioni.length > 0 &&
        !confirm(
          `Sostituire le ${formazioni.length} squadre attualmente caricate con le ${parsed.length} del file importato?`
        )
      ) {
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      setFormazioni(parsed);
      setCaricato(parsed.length);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore durante l'importazione del file.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFile}
        className="text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-900 file:text-white file:px-3 file:py-1.5"
      />
      {errore && <p className="text-red-500 text-sm mt-2">{errore}</p>}
      {caricato !== null && (
        <p className="text-green-600 text-sm mt-2">{caricato} squadre importate con successo.</p>
      )}
    </div>
  );
}
