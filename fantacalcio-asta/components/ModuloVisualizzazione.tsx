"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { coloreSfondoSlot, Modulo, SlotModulo } from "@/lib/moduliMantra";
import { costruisciMatchmaker } from "@/lib/bipartiteMatching";
import { Player, RUOLO_MANTRA_COLORE } from "@/lib/types";
import { isSafeHttpUrl } from "@/lib/url";

function ruoliCompatibiliConSlot(player: Player, slot: SlotModulo): boolean {
  return (player.ruoliMantra ?? []).some((r) => slot.includes(r));
}

function FotoGiocatore({ player, size }: { player: Player; size: number }) {
  const stile = { width: size, height: size };
  if (isSafeHttpUrl(player.fpedia?.immagineUrl)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={player.fpedia?.immagineUrl}
        alt=""
        style={stile}
        className="rounded-full object-contain bg-slate-100 border border-white/40"
      />
    );
  }
  return <div style={stile} className="rounded-full bg-slate-700 border border-white/40" />;
}

interface CartaSlotProps {
  slot: SlotModulo;
  player: Player | undefined;
  sostituti: Player[];
  aperto: boolean;
  onToggle: () => void;
  onScegli: (id: string) => void;
  onRimuovi: () => void;
}

function CartaSlot({ slot, player, sostituti, aperto, onToggle, onScegli, onRimuovi }: CartaSlotProps) {
  const haSostituti = sostituti.length > 0;
  const azionabile = haSostituti || !!player;

  return (
    <div className="relative flex flex-col items-center gap-1 w-20">
      <button
        onClick={azionabile ? onToggle : undefined}
        className={`relative ${azionabile ? "cursor-pointer" : "cursor-default"}`}
        title={player ? player.nome : `Vuoto (${slot.join("/")})`}
      >
        {player ? (
          <FotoGiocatore player={player} size={48} />
        ) : (
          <div
            className="w-12 h-12 rounded-full border-2 border-dashed border-white/50 flex items-center justify-center text-white/60 text-[10px]"
          >
            vuoto
          </div>
        )}
        {haSostituti && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center border-2 border-white">
            +
          </span>
        )}
      </button>

      <div className="flex gap-0.5 flex-wrap justify-center">
        {(player?.ruoliMantra ?? slot).map((r, i) => (
          <span
            key={i}
            className="text-white text-[9px] font-bold rounded px-1"
            style={{ backgroundColor: RUOLO_MANTRA_COLORE[r] }}
          >
            {r}
          </span>
        ))}
      </div>

      {player ? (
        <>
          <Link
            href={`/giocatore/${encodeURIComponent(player.id)}`}
            className="text-white text-[11px] font-medium text-center leading-tight hover:underline"
          >
            {player.nome}
          </Link>
          <span className="text-white/70 text-[9px] text-center leading-tight">{player.squadra}</span>
        </>
      ) : (
        <span className="text-white/60 text-[10px]">Vuoto</span>
      )}

      {aperto && (
        <div className="absolute top-full mt-1 z-10 bg-white rounded shadow-lg border border-slate-200 w-40 py-1 text-slate-800">
          {sostituti.length > 0 && (
            <>
              <p className="text-[10px] uppercase text-slate-400 px-2 pb-1">Sostituisci con</p>
              {sostituti.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onScegli(s.id)}
                  className="w-full text-left text-xs px-2 py-1 hover:bg-slate-100"
                >
                  {s.nome} <span className="text-slate-400">({(s.ruoliMantra ?? []).join("/")})</span>
                </button>
              ))}
            </>
          )}
          {player && (
            <button
              onClick={onRimuovi}
              className="w-full text-left text-xs px-2 py-1 hover:bg-red-50 text-red-600 border-t border-slate-100 mt-1"
            >
              Rimuovi dal campo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ModuloVisualizzazione({
  modulo,
  mieiMantra,
  onClose,
}: {
  modulo: Modulo;
  mieiMantra: Player[];
  onClose: () => void;
}) {
  const assegnazioneIniziale = useMemo(() => {
    const giocatori = mieiMantra.map((p) => ({ id: p.id, ruoli: p.ruoliMantra ?? [] }));
    const matcher = costruisciMatchmaker(modulo.slot, giocatori);
    return matcher.assegnazioniComplete();
  }, [modulo, mieiMantra]);

  const [assegnazione, setAssegnazione] = useState<(string | undefined)[]>(assegnazioneIniziale);
  const [slotAperto, setSlotAperto] = useState<number | null>(null);

  const playerById = useMemo(() => new Map(mieiMantra.map((p) => [p.id, p])), [mieiMantra]);
  const titolariIds = new Set(assegnazione.filter((id): id is string => !!id));
  const panchina = mieiMantra.filter((p) => !titolariIds.has(p.id));

  function sostitutiPer(slotIndex: number): Player[] {
    return panchina.filter((p) => ruoliCompatibiliConSlot(p, modulo.slot[slotIndex]));
  }

  function scegli(slotIndex: number, nuovoId: string) {
    setAssegnazione((prev) => {
      const next = [...prev];
      next[slotIndex] = nuovoId;
      return next;
    });
    setSlotAperto(null);
  }

  function rimuovi(slotIndex: number) {
    setAssegnazione((prev) => {
      const next = [...prev];
      next[slotIndex] = undefined;
      return next;
    });
    setSlotAperto(null);
  }

  function ripristina() {
    setAssegnazione(assegnazioneIniziale);
    setSlotAperto(null);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-lg">{modulo.nome}</h2>
          <div className="flex items-center gap-2">
            <button onClick={ripristina} className="text-xs bg-slate-700 text-white rounded px-2 py-1 hover:bg-slate-600">
              Ripristina automatica
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none px-1">
              ✕
            </button>
          </div>
        </div>

        <p className="text-white/60 text-xs mb-3">
          Clicca su un giocatore o su uno slot vuoto con il segno <strong className="text-white">+</strong> per
          sostituirlo con un panchinaro compatibile.
        </p>

        <div className="bg-green-600 rounded relative border-2 border-white/30 py-5 px-2 space-y-5">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-24 h-24 rounded-full border-2 border-white/20" />
          </div>
          {modulo.righe.map((riga, i) => (
            <div key={i} className="flex justify-center gap-3 flex-wrap relative">
              {riga.map((idx) => (
                <CartaSlot
                  key={idx}
                  slot={modulo.slot[idx]}
                  player={assegnazione[idx] ? playerById.get(assegnazione[idx] as string) : undefined}
                  sostituti={sostitutiPer(idx)}
                  aperto={slotAperto === idx}
                  onToggle={() => setSlotAperto((cur) => (cur === idx ? null : idx))}
                  onScegli={(id) => scegli(idx, id)}
                  onRimuovi={() => rimuovi(idx)}
                />
              ))}
            </div>
          ))}
        </div>

        <h3 className="text-white/70 text-xs uppercase mt-4 mb-2">Panchina ({panchina.length})</h3>
        {panchina.length === 0 ? (
          <p className="text-white/40 text-xs">Nessun giocatore in panchina.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {panchina.map((p) => (
              <div key={p.id} className="flex items-center gap-2 bg-slate-800 rounded px-2 py-1.5">
                <FotoGiocatore player={p} size={28} />
                <div className="leading-tight">
                  <div className="text-white text-xs font-medium">{p.nome}</div>
                  <div className="text-white/50 text-[10px]">
                    {(p.ruoliMantra ?? []).map((r, i) => (
                      <span key={i} className="mr-1" style={{ color: RUOLO_MANTRA_COLORE[r] }}>
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
