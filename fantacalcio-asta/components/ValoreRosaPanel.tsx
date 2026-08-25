"use client";

import { useMemo } from "react";
import { RUOLI } from "@/lib/types";
import { computeMantraStato, computeRoleStats } from "@/lib/suggestions";
import { computeContestoValoreAtteso, computeValoreAtteso } from "@/lib/valoreAtteso";
import { useAuctionStore } from "@/lib/store";

function mediana(valori: number[]): number | undefined {
  if (valori.length === 0) return undefined;
  const ordinati = [...valori].sort((a, b) => a - b);
  const meta = Math.floor(ordinati.length / 2);
  return ordinati.length % 2 === 0 ? (ordinati[meta - 1] + ordinati[meta]) / 2 : ordinati[meta];
}

/**
 * Proiezione (non un vincolo di budget: quello lo gestisce il simulatore
 * nella tabella) di quanti punti fantacalcio ci si aspetta dalla rosa
 * completa: somma il valore atteso di chi e' gia' stato preso, piu' una
 * stima per gli slot ancora vuoti basata sulla mediana del valore atteso tra
 * i giocatori dello stesso ruolo/linea ancora disponibili sul mercato.
 */
export function ValoreRosaPanel() {
  const players = useAuctionStore((s) => s.players);
  const settings = useAuctionStore((s) => s.settings);
  const isMantra = settings.modalita === "mantra";

  const { sommaAcquisiti, valutatiAcquisiti, totaleAcquisiti, stimaSlotVuoti } = useMemo(() => {
    const contesto = computeContestoValoreAtteso(players);
    const mie = players.filter((p) => p.stato === "mia");
    const valoriMie = mie.map((p) => computeValoreAtteso(p, contesto));
    const sommaAcquisiti = valoriMie.reduce((sum, v) => sum + (v?.totale ?? 0), 0);
    const valutatiAcquisiti = valoriMie.filter((v) => v !== null).length;

    let stimaSlotVuoti = 0;
    if (isMantra) {
      const stato = computeMantraStato(players, settings);
      const disponibiliValori = players
        .filter((p) => p.stato === "disponibile")
        .map((p) => computeValoreAtteso(p, contesto)?.totale)
        .filter((v): v is number => v !== undefined);
      const med = mediana(disponibiliValori) ?? 0;
      stimaSlotVuoti = stato.postiRimanenti * med;
    } else {
      const roleStats = computeRoleStats(players, settings);
      for (const ruolo of RUOLI) {
        const slotRimanenti = roleStats[ruolo].slotRimanenti;
        if (slotRimanenti <= 0) continue;
        const disponibiliValori = players
          .filter((p) => p.stato === "disponibile" && p.ruolo === ruolo)
          .map((p) => computeValoreAtteso(p, contesto)?.totale)
          .filter((v): v is number => v !== undefined);
        const med = mediana(disponibiliValori) ?? 0;
        stimaSlotVuoti += slotRimanenti * med;
      }
    }

    return { sommaAcquisiti, valutatiAcquisiti, totaleAcquisiti: mie.length, stimaSlotVuoti };
  }, [players, settings, isMantra]);

  if (totaleAcquisiti === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold text-lg mb-3">Valore atteso rosa</h2>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-slate-500 text-sm">Punti attesi presi</span>
        <span className="text-2xl font-bold">{Math.round(sommaAcquisiti)}</span>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {valutatiAcquisiti}/{totaleAcquisiti} giocatori con dati FPEDIA
      </p>
      {stimaSlotVuoti > 0 && (
        <div className="flex justify-between items-baseline border-t border-slate-100 pt-3">
          <span className="text-slate-500 text-sm" title="Stima, non un vincolo di budget: mediana del valore atteso tra i disponibili dello stesso ruolo, moltiplicata per gli slot ancora vuoti.">
            + stima slot vuoti
          </span>
          <span className="text-lg font-semibold text-slate-500">{Math.round(stimaSlotVuoti)}</span>
        </div>
      )}
    </div>
  );
}
