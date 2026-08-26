"use client";

import { useMemo, useState } from "react";
import { coloreSfondoSlot, MODULI_MANTRA, Modulo, SlotModulo } from "@/lib/moduliMantra";
import { costruisciMatchmaker, contaCombinazioniComplete } from "@/lib/bipartiteMatching";
import { Player } from "@/lib/types";
import { useAuctionStore } from "@/lib/store";
import { ModuloVisualizzazione } from "@/components/ModuloVisualizzazione";

function Badge({ slot }: { slot: SlotModulo }) {
  return (
    <span
      className="text-white text-xs font-bold rounded px-2 py-1 shadow"
      style={coloreSfondoSlot(slot)}
      title={slot.join(" o ")}
    >
      {slot.join("/")}
    </span>
  );
}

function raggruppaSlotMancanti(slotScoperti: SlotModulo[]): { chiave: string; conteggio: number }[] {
  const mappa = new Map<string, number>();
  for (const slot of slotScoperti) {
    const chiave = slot.join("/");
    mappa.set(chiave, (mappa.get(chiave) ?? 0) + 1);
  }
  return Array.from(mappa.entries()).map(([chiave, conteggio]) => ({ chiave, conteggio }));
}

function CampoModulo({ modulo, mieiMantra, onClick }: { modulo: Modulo; mieiMantra: Player[]; onClick: () => void }) {
  const { coperti, totale, mancanti, combinazioni } = useMemo(() => {
    const giocatori = mieiMantra.map((p) => ({ id: p.id, ruoli: p.ruoliMantra ?? [] }));
    const matcher = costruisciMatchmaker(modulo.slot, giocatori);
    const completo = matcher.coperti === matcher.totale;
    return {
      coperti: matcher.coperti,
      totale: matcher.totale,
      mancanti: raggruppaSlotMancanti(matcher.slotScoperti()),
      combinazioni: completo ? contaCombinazioniComplete(modulo.slot, giocatori) : 0,
    };
  }, [modulo, mieiMantra]);

  const completo = coperti === totale;

  return (
    <button onClick={onClick} className="text-left w-full">
      <div className="bg-slate-900 rounded-lg p-3 hover:ring-2 hover:ring-slate-400 transition">
        <h3 className="text-white text-center font-bold mb-2">{modulo.nome}</h3>
        <div className="bg-green-600 rounded relative border-2 border-white/30 py-4 px-2 space-y-4">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full border-2 border-white/20" />
          </div>
          {modulo.righe.map((riga, i) => (
            <div key={i} className="flex justify-center gap-3 relative">
              {riga.map((idx) => (
                <Badge key={idx} slot={modulo.slot[idx]} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 text-xs text-center">
        {completo ? (
          <span className="text-green-700">
            ✓ Completabile — {combinazioni >= 999 ? "999+" : combinazioni}{" "}
            {combinazioni === 1 ? "combinazione possibile" : "combinazioni possibili"}
          </span>
        ) : (
          <span className="text-amber-700">
            Mancano: {mancanti.map((m) => `${m.conteggio}× ${m.chiave}`).join(", ")}
          </span>
        )}
      </div>
    </button>
  );
}

export default function ModuliPage() {
  const players = useAuctionStore((s) => s.players);
  const settings = useAuctionStore((s) => s.settings);
  const mieiMantra = useMemo(() => players.filter((p) => p.stato === "mia"), [players]);
  const [moduloAperto, setModuloAperto] = useState<Modulo | null>(null);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Moduli Mantra</h1>
        <p className="text-slate-500 text-sm">
          Gli 11 moduli usati dalla dashboard per calcolare la copertura della rosa e i ruoli più
          richiesti (vedi pannello Budget in modalità Mantra). Ogni slot mostra i ruoli che possono
          occuparlo (es. &quot;W/A&quot; = ala o attaccante). Sotto ogni modulo, quante formazioni
          diverse puoi comporre con la rosa attuale (se è completabile) oppure quali ruoli mancano
          ancora. Clicca su un modulo per vedere i giocatori schierati in campo e provare le
          sostituzioni con la panchina. Se un modulo non corrisponde al tuo schema, si corregge in{" "}
          <code className="bg-slate-100 px-1 rounded">lib/moduliMantra.ts</code>.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULI_MANTRA.map((modulo) => (
          <CampoModulo key={modulo.nome} modulo={modulo} mieiMantra={mieiMantra} onClick={() => setModuloAperto(modulo)} />
        ))}
      </div>

      {moduloAperto && (
        <ModuloVisualizzazione
          modulo={moduloAperto}
          mieiMantra={mieiMantra}
          settings={settings}
          onClose={() => setModuloAperto(null)}
        />
      )}
    </div>
  );
}
