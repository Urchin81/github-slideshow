"use client";

import { useRef, useState } from "react";
import { parseListino } from "@/lib/parseListino";
import { diffListino, ImportDiff } from "@/lib/mergeListino";
import { Player } from "@/lib/types";
import { useAuctionStore } from "@/lib/store";

interface PendingImport {
  /** Il listino appena letto dal file, cosi' com'e' (per l'opzione "aggiorna tutto"). */
  parsed: Player[];
  /** Il risultato del merge intelligente col listino gia' caricato (per l'opzione "mantieni e aggiorna"). */
  merged: Player[];
  diff: ImportDiff;
}

export function ImportListino() {
  const players = useAuctionStore((s) => s.players);
  const loadPlayers = useAuctionStore((s) => s.loadPlayers);
  const [errore, setErrore] = useState<string | null>(null);
  const [caricato, setCaricato] = useState(false);
  const [pending, setPending] = useState<PendingImport | null>(null);
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

      // Nessun listino ancora caricato: non c'e' nulla da confrontare/scegliere, si carica e basta.
      if (players.length === 0) {
        loadPlayers(parsed);
        setCaricato(true);
        return;
      }

      const { merged, diff } = diffListino(players, parsed);
      setPending({ parsed, merged, diff });
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore durante l'importazione del file.");
    }
  }

  function resetInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  function mantieniEAggiorna() {
    if (!pending) return;
    loadPlayers(pending.merged);
    setPending(null);
    setCaricato(true);
    resetInput();
  }

  function aggiornaTutto() {
    if (!pending) return;
    const conDatiRaccolti = players.filter(
      (p) => p.stato !== "disponibile" || p.preferito || p.fpedia || (p.notizie?.length ?? 0) > 0
    );
    const avviso =
      conDatiRaccolti.length > 0
        ? `Attenzione: il listino attuale verrà cancellato e sostituito da zero con il nuovo file. Perderai i dati di ${conDatiRaccolti.length} giocatori (assegnazioni, prezzi, preferiti, statistiche FPEDIA, notizie). Procedere comunque?`
        : "Cancellare il listino attuale e sostituirlo da zero con il nuovo file?";
    if (!confirm(avviso)) return;
    loadPlayers(pending.parsed);
    setPending(null);
    setCaricato(true);
    resetInput();
  }

  function annullaImport() {
    setPending(null);
    resetInput();
  }

  const rimossiInRosa = pending?.diff.rimossi.filter((p) => p.stato === "mia") ?? [];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold text-lg mb-2">Importa listino quotazioni</h2>
      <p className="text-sm text-slate-500 mb-3">
        Carica il file Excel/CSV con le quotazioni ufficiali (colonne Ruolo, Nome, Squadra, Qt.A, e
        opzionalmente RM per i ruoli Mantra). Se importi un file dopo il primo, l&apos;app confronta i
        giocatori esistenti e prima di toccare qualsiasi cosa ti chiede come procedere: aggiornare solo
        i cambiamenti mantenendo tutto il resto, oppure ricaricare tutto da zero.
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
              non presenti nel nuovo file
            </li>
          </ul>

          {rimossiInRosa.length > 0 && (
            <p className="text-sm bg-red-50 text-red-700 border border-red-200 rounded p-2 mb-3">
              Attenzione: {rimossiInRosa.length} dei giocatori non più presenti{" "}
              {rimossiInRosa.length === 1 ? "è già nella tua rosa" : "sono già nella tua rosa"} (
              {rimossiInRosa.map((p) => p.nome).join(", ")}). Con &quot;Mantieni e aggiorna&quot; verranno
              comunque rimossi.
            </p>
          )}

          <p className="text-xs text-slate-500 mb-2">Come vuoi procedere?</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={mantieniEAggiorna}
              className="bg-slate-900 text-white rounded px-3 py-2 text-sm"
              title="Aggiunge i nuovi, rimuove quelli assenti, aggiorna i valori cambiati; mantiene stato, prezzo, preferiti e statistiche FPEDIA di ogni giocatore già tracciato"
            >
              Mantieni e aggiorna solo i cambiamenti
            </button>
            <button
              onClick={aggiornaTutto}
              className="bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2 text-sm hover:bg-red-100"
              title="Cancella tutto il listino attuale (assegnazioni, prezzi, preferiti, statistiche) e lo sostituisce da zero col nuovo file"
            >
              Aggiorna tutto (cancella i dati attuali)
            </button>
            <button onClick={annullaImport} className="text-sm text-slate-500 hover:underline px-2">
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
