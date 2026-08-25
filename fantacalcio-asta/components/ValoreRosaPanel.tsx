"use client";

import { useMemo } from "react";
import { RUOLI } from "@/lib/types";
import { computeMantraStato, computeRoleStats } from "@/lib/suggestions";
import { computeValoreAtteso } from "@/lib/valoreAtteso";
import { useAuctionStore } from "@/lib/store";

function mediana(valori: number[]): number | undefined {
  if (valori.length === 0) return undefined;
  const ordinati = [...valori].sort((a, b) => a - b);
  const meta = Math.floor(ordinati.length / 2);
  return ordinati.length % 2 === 0 ? (ordinati[meta - 1] + ordinati[meta]) / 2 : ordinati[meta];
}

/**
 * Proiezione (non un vincolo di budget: quello lo gestisce il simulatore
 * nella tabella) del punteggio FPEDIA medio della rosa completa: media del
 * valore atteso (Algoritmo FCP + Punteggio FCP) di chi e' gia' stato preso,
 * combinata con una stima per gli slot ancora vuoti basata sulla mediana del
 * valore atteso tra i giocatori dello stesso ruolo/linea ancora disponibili.
 * Una media, non una somma, perche' il valore atteso e' ora un punteggio
 * 0-100 (non punti fantacalcio cumulabili).
 */
export function ValoreRosaPanel() {
  const players = useAuctionStore((s) => s.players);
  const settings = useAuctionStore((s) => s.settings);
  const isMantra = settings.modalita === "mantra";

  const { mediaAcquisiti, valutatiAcquisiti, totaleAcquisiti, mediaProiettata, slotVuotiConsiderati } = useMemo(() => {
    const mie = players.filter((p) => p.stato === "mia");
    const valoriMie = mie.map((p) => computeValoreAtteso(p)?.totale).filter((v): v is number => v !== undefined);
    const sommaAcquisiti = valoriMie.reduce((sum, v) => sum + v, 0);
    const valutatiAcquisiti = valoriMie.length;
    const mediaAcquisiti = valutatiAcquisiti > 0 ? sommaAcquisiti / valutatiAcquisiti : null;

    let sommaSlotVuoti = 0;
    let slotVuotiConsiderati = 0;
    if (isMantra) {
      const stato = computeMantraStato(players, settings);
      const disponibiliValori = players
        .filter((p) => p.stato === "disponibile")
        .map((p) => computeValoreAtteso(p)?.totale)
        .filter((v): v is number => v !== undefined);
      const med = mediana(disponibiliValori);
      if (med !== undefined && stato.postiRimanenti > 0) {
        sommaSlotVuoti = stato.postiRimanenti * med;
        slotVuotiConsiderati = stato.postiRimanenti;
      }
    } else {
      const roleStats = computeRoleStats(players, settings);
      for (const ruolo of RUOLI) {
        const slotRimanenti = roleStats[ruolo].slotRimanenti;
        if (slotRimanenti <= 0) continue;
        const disponibiliValori = players
          .filter((p) => p.stato === "disponibile" && p.ruolo === ruolo)
          .map((p) => computeValoreAtteso(p)?.totale)
          .filter((v): v is number => v !== undefined);
        const med = mediana(disponibiliValori);
        if (med === undefined) continue;
        sommaSlotVuoti += slotRimanenti * med;
        slotVuotiConsiderati += slotRimanenti;
      }
    }

    const mediaProiettata =
      valutatiAcquisiti + slotVuotiConsiderati > 0
        ? (sommaAcquisiti + sommaSlotVuoti) / (valutatiAcquisiti + slotVuotiConsiderati)
        : null;

    return { mediaAcquisiti, valutatiAcquisiti, totaleAcquisiti: mie.length, mediaProiettata, slotVuotiConsiderati };
  }, [players, settings, isMantra]);

  if (totaleAcquisiti === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold text-lg mb-3">Valore atteso rosa (FPEDIA)</h2>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-slate-500 text-sm">Punteggio medio preso</span>
        <span className="text-2xl font-bold">{mediaAcquisiti !== null ? Math.round(mediaAcquisiti) : "—"}</span>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {valutatiAcquisiti}/{totaleAcquisiti} giocatori con dati FPEDIA
      </p>
      {slotVuotiConsiderati > 0 && mediaProiettata !== null && (
        <div className="flex justify-between items-baseline border-t border-slate-100 pt-3">
          <span
            className="text-slate-500 text-sm"
            title="Stima, non un vincolo di budget: media pesata tra i giocatori già presi e la mediana del valore atteso tra i disponibili dello stesso ruolo per gli slot ancora vuoti."
          >
            Proiezione a rosa completa
          </span>
          <span className="text-lg font-semibold text-slate-500">{Math.round(mediaProiettata)}</span>
        </div>
      )}
    </div>
  );
}
