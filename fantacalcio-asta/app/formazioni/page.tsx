"use client";

import { useState } from "react";
import { useAuctionStore } from "@/lib/store";
import { FormazioneSquadra, serializzaFormazioniCsv } from "@/lib/formazioni";
import { FormazioneSquadraCard } from "@/components/FormazioneSquadraCard";
import { FormazioneForm } from "@/components/FormazioneForm";
import { ImportFormazioni } from "@/components/ImportFormazioni";

function scaricaCsv(formazioni: FormazioneSquadra[]) {
  const csv = serializzaFormazioniCsv(formazioni);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "formazioni-serie-a.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function FormazioniPage() {
  const formazioni = useAuctionStore((s) => s.formazioni);
  const salvaFormazioneSquadra = useAuctionStore((s) => s.salvaFormazioneSquadra);
  const eliminaFormazioneSquadra = useAuctionStore((s) => s.eliminaFormazioneSquadra);
  const [squadraInModifica, setSquadraInModifica] = useState<FormazioneSquadra | null>(null);
  const [nuovaSquadraAperta, setNuovaSquadraAperta] = useState(false);
  const [importAperto, setImportAperto] = useState(false);

  const squadreOrdinate = [...formazioni].sort((a, b) => a.squadra.localeCompare(b.squadra));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Probabili formazioni</h1>
          <p className="text-slate-500 text-sm max-w-3xl">
            Formazione titolare e ballottaggi per ogni squadra di Serie A, utili per valutare le
            probabilità di impiego durante l&apos;asta. Puoi modificarle a mano dalla scheda di ogni
            squadra, oppure importare/esportare tutto in blocco con un file CSV.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setNuovaSquadraAperta(true)}
            className="bg-slate-900 text-white rounded px-3 py-2 text-sm"
          >
            + Nuova squadra
          </button>
          <button
            onClick={() => setImportAperto((v) => !v)}
            className="bg-white border border-slate-300 rounded px-3 py-2 text-sm hover:bg-slate-50"
          >
            Importa CSV
          </button>
          <button
            onClick={() => scaricaCsv(formazioni)}
            disabled={formazioni.length === 0}
            className="bg-white border border-slate-300 rounded px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
            title="Scarica le formazioni attualmente caricate in un file CSV"
          >
            Esporta CSV
          </button>
        </div>
      </div>

      {importAperto && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="font-semibold text-sm mb-2">Importa formazioni da CSV</h2>
          <p className="text-xs text-slate-500 mb-3">
            Colonne attese: Squadra, Modulo, Ruolo, RuoloMantra, Nome, Titolare (SI/NO),
            GruppoBallottaggio, Ordine, Nota. &quot;Esporta CSV&quot; genera un file con lo stesso
            formato, utile come modello.
          </p>
          <ImportFormazioni />
        </div>
      )}

      {squadreOrdinate.length === 0 ? (
        <p className="text-slate-500 text-sm">
          Nessuna squadra caricata. Importa un CSV oppure crea una squadra con &quot;+ Nuova squadra&quot;.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {squadreOrdinate.map((f) => (
            <FormazioneSquadraCard
              key={f.squadra}
              formazione={f}
              onModifica={() => setSquadraInModifica(f)}
              onElimina={() => {
                if (confirm(`Eliminare la formazione di ${f.squadra}?`)) eliminaFormazioneSquadra(f.squadra);
              }}
            />
          ))}
        </div>
      )}

      {(squadraInModifica || nuovaSquadraAperta) && (
        <FormazioneForm
          formazioneIniziale={squadraInModifica}
          squadreEsistenti={formazioni.map((f) => f.squadra)}
          onSalva={(f) => {
            salvaFormazioneSquadra(f);
            setSquadraInModifica(null);
            setNuovaSquadraAperta(false);
          }}
          onAnnulla={() => {
            setSquadraInModifica(null);
            setNuovaSquadraAperta(false);
          }}
        />
      )}
    </div>
  );
}
