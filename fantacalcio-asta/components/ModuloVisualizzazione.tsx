"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { coloreSfondoSlot, Modulo, SlotModulo } from "@/lib/moduliMantra";
import { costruisciMatchmaker, generaCombinazioniPerPunteggio } from "@/lib/bipartiteMatching";
import { Player, RUOLO_MANTRA_COLORE, RuoloMantra } from "@/lib/types";
import { isSafeHttpUrl } from "@/lib/url";
import { classeBordoTitolarita } from "@/lib/titolarita";
import { BadgeInfortunio } from "@/components/BadgeInfortunio";
import { BadgeFuoriclasse } from "@/components/BadgeFuoriclasse";

function ruoliCompatibiliConSlot(player: Player, slot: SlotModulo): boolean {
  return (player.ruoliMantra ?? []).some((r) => slot.includes(r));
}

// Pillole dei ruoli disposte lungo il bordo della foto, in senso orario a
// partire da vicino alle ore 12: il passo angolare e' minore della larghezza
// angolare di una pillola, cosi' restano leggermente sovrapposte (stesso
// effetto "vicine" di prima) ma seguono il cerchio invece di una cascata
// diagonale.
const BADGE_SIZE_RUOLO = 18;
const ANGOLO_INIZIALE_RUOLO = -10; // gradi, 0 = ore 12, positivo = senso orario
const PASSO_ANGOLARE_RUOLO = 28; // gradi tra una pillola e la successiva

function styleRuolo(i: number, size: number): React.CSSProperties {
  const raggio = size / 2;
  const angolo = ((ANGOLO_INIZIALE_RUOLO + i * PASSO_ANGOLARE_RUOLO) * Math.PI) / 180;
  const cx = size / 2 + raggio * Math.sin(angolo) - BADGE_SIZE_RUOLO / 2;
  const cy = size / 2 - raggio * Math.cos(angolo) - BADGE_SIZE_RUOLO / 2;
  return { left: cx, top: cy };
}

function PilloleRuolo({ ruoli, size }: { ruoli: RuoloMantra[]; size: number }) {
  return (
    <>
      {ruoli.slice(0, 4).map((r, i) => (
        <span
          key={r}
          className="absolute text-white text-[9px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center border border-white/80 leading-none shadow"
          style={{ ...styleRuolo(i, size), backgroundColor: RUOLO_MANTRA_COLORE[r], zIndex: 10 - i }}
        >
          {r}
        </span>
      ))}
    </>
  );
}

function FotoGiocatore({ player, ruoli, size }: { player: Player; ruoli: RuoloMantra[]; size: number }) {
  const stile = { width: size, height: size };
  return (
    <span className="relative inline-block">
      {isSafeHttpUrl(player.fpedia?.immagineUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.fpedia?.immagineUrl}
          alt=""
          style={stile}
          className={`rounded-full object-contain bg-slate-100 ${classeBordoTitolarita(player)}`}
        />
      ) : (
        <div style={stile} className={`rounded-full bg-slate-700 ${classeBordoTitolarita(player)}`} />
      )}
      <PilloleRuolo ruoli={ruoli} size={size} />
      {player.infortunato && <BadgeInfortunio size={Math.max(10, Math.round(size * 0.3))} />}
      {player.fuoriclasse && <BadgeFuoriclasse size={Math.max(10, Math.round(size * 0.3))} />}
    </span>
  );
}

/** Stato del trascinamento in corso: il giocatore preso e, se veniva dal campo, lo slot di origine (null = veniva dalla panchina). */
interface Trascinamento {
  playerId: string;
  origine: number | null;
}

interface CartaSlotProps {
  index: number;
  slot: SlotModulo;
  player: Player | undefined;
  sostituti: Player[];
  aperto: boolean;
  evidenziato: boolean;
  onToggleRimuovi: () => void;
  onToggleSostituti: () => void;
  onRimuovi: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  /** true/false = trascinamento in corso, compatibile o no con questo slot; null = nessun trascinamento in corso. */
  compatibile: boolean | null;
}

function CartaSlot({
  index,
  slot,
  player,
  sostituti,
  aperto,
  evidenziato,
  onToggleRimuovi,
  onToggleSostituti,
  onRimuovi,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  compatibile,
}: CartaSlotProps) {
  const haSostituti = sostituti.length > 0;

  return (
    <div
      data-slot-index={index}
      className={`relative flex flex-col items-center gap-1 w-24 rounded-lg transition ${
        compatibile === true ? "ring-2 ring-green-400" : compatibile === false ? "opacity-40" : ""
      }`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="relative">
        <button
          onClick={player ? onToggleRimuovi : undefined}
          draggable={!!player}
          onDragStart={player ? onDragStart : undefined}
          onDragEnd={player ? onDragEnd : undefined}
          className={`relative ${player ? "cursor-pointer cursor-grab active:cursor-grabbing" : "cursor-default"}`}
          title={player ? player.nome : `Vuoto (${slot.join("/")})`}
        >
          {player ? (
            <FotoGiocatore player={player} ruoli={player.ruoliMantra ?? []} size={56} />
          ) : (
            <div className="relative w-14 h-14 rounded-full border-2 border-dashed border-white/50 flex items-center justify-center text-white/60 text-[10px]">
              vuoto
              <PilloleRuolo ruoli={slot} size={56} />
            </div>
          )}
        </button>
        {haSostituti && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSostituti();
            }}
            title={`${sostituti.length} sostituto/i disponibili in panchina`}
            className={`absolute -bottom-1 -left-1 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-white ${
              evidenziato ? "bg-blue-400 ring-2 ring-blue-300" : "bg-blue-600"
            }`}
          >
            {sostituti.length}
          </button>
        )}
      </div>

      {/* Posizione del modulo per questo slot: sempre il ruolo richiesto, non il ruolo del giocatore che lo occupa (quello è sulla foto) — così resta chiaro quale posizione della formazione questa carta rappresenta anche quando cambia chi la occupa. */}
      <span
        className="text-white text-[9px] font-bold rounded px-1.5"
        style={coloreSfondoSlot(slot)}
        title={`Posizione: ${slot.join("/")}`}
      >
        {slot.join("/")}
      </span>

      {player ? (
        <>
          <Link
            href={`/giocatore/${encodeURIComponent(player.id)}`}
            className="text-white text-sm font-semibold text-center leading-tight hover:underline"
          >
            {player.nome}
          </Link>
          <span className="text-white/70 text-[9px] text-center leading-tight">{player.squadra}</span>
        </>
      ) : (
        <span className="text-white/60 text-[10px]">Vuoto</span>
      )}

      {aperto && player && (
        <div className="absolute top-full mt-1 z-10 bg-white rounded shadow-lg border border-slate-200 w-40 py-1 text-slate-800">
          <button
            onClick={onRimuovi}
            className="w-full text-left text-xs px-2 py-1 hover:bg-red-50 text-red-600"
          >
            Rimuovi dal campo
          </button>
        </div>
      )}
    </div>
  );
}

function CartaPanchina({
  player,
  onDragStart,
  onDragEnd,
  evidenziato,
  attenuato,
  onClick,
}: {
  player: Player;
  onDragStart: () => void;
  onDragEnd: () => void;
  evidenziato: boolean;
  attenuato: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      draggable
      data-player-id={player.id}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`flex items-center gap-2 bg-slate-800 rounded px-2 py-1.5 cursor-grab active:cursor-grabbing transition ${
        evidenziato ? "ring-2 ring-blue-400 cursor-pointer" : attenuato ? "opacity-40" : ""
      }`}
    >
      {/* Foto senza pillole di ruolo sovrapposte: a questa dimensione (28px) sarebbero illeggibili, meglio il testo accanto come prima. */}
      <FotoGiocatore player={player} ruoli={[]} size={28} />
      <div className="leading-tight">
        <div className="text-white text-xs font-medium">{player.nome}</div>
        <div className="text-white/50 text-[10px]">
          {(player.ruoliMantra ?? []).map((r, i) => (
            <span key={i} className="mr-1" style={{ color: RUOLO_MANTRA_COLORE[r] }}>
              {r}
            </span>
          ))}
        </div>
      </div>
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
  const playerById = useMemo(() => new Map(mieiMantra.map((p) => [p.id, p])), [mieiMantra]);

  // Le migliori formazioni possibili (somma ALG FCP dei titolari, decrescente): un
  // risultato "miglior sforzo" entro i tetti di generaCombinazioniPerPunteggio, non una garanzia
  // di ottimalità globale con rose molto simmetriche (stesso spirito del tetto di
  // contaCombinazioniComplete). Se non se ne trova nessuna (es. modulo non completamente
  // coprbile), si ricade sull'assegnazione greedy singola di sempre, per non regredire.
  const combinazioni = useMemo(() => {
    const giocatori = mieiMantra.map((p) => ({ id: p.id, ruoli: p.ruoliMantra ?? [] }));
    const risultato = generaCombinazioniPerPunteggio(
      modulo.slot,
      giocatori,
      (id) => playerById.get(id)?.fpedia?.algFcp ?? 0
    );
    if (risultato.length > 0) return risultato;
    return [
      { assegnazione: costruisciMatchmaker(modulo.slot, giocatori).assegnazioniComplete(), punteggioTotale: 0 },
    ];
  }, [modulo, mieiMantra, playerById]);

  const [indiceCombinazione, setIndiceCombinazione] = useState(0);
  const combinazioneAttuale = combinazioni[Math.min(indiceCombinazione, combinazioni.length - 1)];

  const [assegnazione, setAssegnazione] = useState<(string | undefined)[]>(combinazioneAttuale.assegnazione);
  const [slotAperto, setSlotAperto] = useState<number | null>(null);
  const [slotEvidenziato, setSlotEvidenziato] = useState<number | null>(null);
  const [trascinamento, setTrascinamento] = useState<Trascinamento | null>(null);

  const titolariIds = new Set(assegnazione.filter((id): id is string => !!id));
  const panchina = mieiMantra.filter((p) => !titolariIds.has(p.id));

  // Punteggio della formazione realmente in campo in questo momento (somma ALG FCP dei
  // titolari attuali): a differenza del "Punteggio" in header — quello della combinazione
  // suggerita scelta con ‹/›, che non si aggiorna con le sostituzioni manuali — questo
  // segue in tempo reale ogni trascina/rilascia o scelta dalla panchina.
  const punteggioLive = useMemo(
    () =>
      assegnazione.reduce((somma, id) => somma + (id ? playerById.get(id)?.fpedia?.algFcp ?? 0 : 0), 0),
    [assegnazione, playerById]
  );

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
    setSlotEvidenziato(null);
  }

  function scegliDaPanchina(playerId: string) {
    if (slotEvidenziato === null) return;
    scegli(slotEvidenziato, playerId);
  }

  function rimuovi(slotIndex: number) {
    setAssegnazione((prev) => {
      const next = [...prev];
      next[slotIndex] = undefined;
      return next;
    });
    setSlotAperto(null);
  }

  function vaiAllaCombinazione(indice: number) {
    setIndiceCombinazione(indice);
    setAssegnazione(combinazioni[indice].assegnazione);
    setSlotAperto(null);
    setSlotEvidenziato(null);
    setTrascinamento(null);
  }

  function ripristina() {
    setAssegnazione(combinazioneAttuale.assegnazione);
    setSlotAperto(null);
    setSlotEvidenziato(null);
  }

  function iniziaTrascinamentoCampo(playerId: string, origine: number) {
    setTrascinamento({ playerId, origine });
  }

  function iniziaTrascinamentoPanchina(playerId: string) {
    setTrascinamento({ playerId, origine: null });
  }

  function fineTrascinamento() {
    setTrascinamento(null);
  }

  /** null = nessun trascinamento in corso; altrimenti true/false a seconda che il giocatore trascinato sia compatibile con lo slot. */
  function compatibilitaSlot(slotIndex: number): boolean | null {
    if (!trascinamento) return null;
    const player = playerById.get(trascinamento.playerId);
    if (!player) return null;
    return ruoliCompatibiliConSlot(player, modulo.slot[slotIndex]);
  }

  function dragOverSlot(e: React.DragEvent, slotIndex: number) {
    if (compatibilitaSlot(slotIndex)) e.preventDefault();
  }

  function dropSuSlot(e: React.DragEvent, slotIndex: number) {
    e.preventDefault();
    if (!trascinamento || !compatibilitaSlot(slotIndex)) return;
    const { playerId, origine } = trascinamento;
    setAssegnazione((prev) => {
      const next = [...prev];
      if (origine !== null) next[origine] = undefined;
      next[slotIndex] = playerId;
      return next;
    });
    setTrascinamento(null);
    setSlotAperto(null);
  }

  function dragOverPanchina(e: React.DragEvent) {
    if (trascinamento) e.preventDefault();
  }

  function dropSuPanchina(e: React.DragEvent) {
    e.preventDefault();
    if (!trascinamento || trascinamento.origine === null) {
      setTrascinamento(null);
      return;
    }
    setAssegnazione((prev) => {
      const next = [...prev];
      next[trascinamento.origine as number] = undefined;
      return next;
    });
    setTrascinamento(null);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-white font-bold text-lg">{modulo.nome}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => vaiAllaCombinazione(indiceCombinazione - 1)}
              disabled={indiceCombinazione <= 0}
              className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-slate-700"
              title="Formazione precedente (punteggio più alto)"
            >
              ‹
            </button>
            <span className="text-xs text-white/60 whitespace-nowrap">
              Formazione {indiceCombinazione + 1}/{combinazioni.length} · Punteggio{" "}
              {Math.round(combinazioneAttuale.punteggioTotale)}
            </span>
            <button
              onClick={() => vaiAllaCombinazione(indiceCombinazione + 1)}
              disabled={indiceCombinazione >= combinazioni.length - 1}
              className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-slate-700"
              title="Formazione successiva (punteggio più basso)"
            >
              ›
            </button>
            <button onClick={ripristina} className="text-xs bg-slate-700 text-white rounded px-2 py-1 hover:bg-slate-600">
              Ripristina automatica
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none px-1">
              ✕
            </button>
          </div>
        </div>

        <p className="text-white/60 text-xs mb-3">
          Le migliori {combinazioni.length} formazioni trovate, ordinate per ALG FCP totale dei
          titolari (‹/› per scorrerle). Clicca sul cerchietto blu di un giocatore per evidenziare i panchinari
          compatibili e sceglierne uno al posto suo, clicca sulla foto di un titolare per rimuoverlo dal campo,
          oppure trascina un giocatore dal campo alla panchina e viceversa: si entra in campo solo negli slot con
          un ruolo compatibile.
        </p>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="bg-green-600 rounded relative border-2 border-white/30 py-5 px-2 space-y-5 flex-1 overflow-hidden">
            {/* Punteggio della formazione realmente in campo ora, aggiornato ad ogni sostituzione. */}
            <div className="absolute top-2 left-2 z-20 bg-white/95 rounded-lg px-2.5 py-1.5 shadow text-slate-900 leading-none">
              <div className="text-[9px] uppercase text-slate-500 tracking-wide">Punteggio</div>
              <div className="font-bold text-lg">{Math.round(punteggioLive)}</div>
            </div>
            {/* Disegno del campo (vista dall'alto): solo la porta in basso, dove sta il portiere — un diagramma di modulo mostra un solo lato del campo, non due porte contrapposte. */}
            <div className="absolute inset-0 pointer-events-none z-0">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border-2 border-white/20" />
              </div>
              {/* Area di rigore */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[64%] h-[20%] border-2 border-white/20 border-b-0" />
              {/* Area piccola */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[34%] h-[9%] border-2 border-white/20 border-b-0" />
              {/* Dischetto del rigore */}
              <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/30" />
              {/* Porta vista dall'alto */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[16%] h-2 border-2 border-white/40 border-b-0" />
              {/* Linea di centrocampo */}
              <div className="absolute top-1/2 inset-x-0 border-t-2 border-white/20" />
              {/* Area di rigore avversaria */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[64%] h-[20%] border-2 border-white/20 border-t-0" />
              {/* Area piccola avversaria */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[34%] h-[9%] border-2 border-white/20 border-t-0" />
              {/* Porta avversaria vista dall'alto */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-[16%] h-2 border-2 border-white/40 border-t-0" />
            </div>
            {/* modulo.righe è portiere->attacco; qui si inverte per avere il portiere in basso e l'attacco in alto (direzione di gioco verso l'alto). */}
            {[...modulo.righe].reverse().map((riga, i) => (
              <div key={i} className="flex justify-center gap-3 flex-wrap relative z-10">
                {riga.map((idx) => (
                  <CartaSlot
                    key={idx}
                    index={idx}
                    slot={modulo.slot[idx]}
                    player={assegnazione[idx] ? playerById.get(assegnazione[idx] as string) : undefined}
                    sostituti={sostitutiPer(idx)}
                    aperto={slotAperto === idx}
                    evidenziato={slotEvidenziato === idx}
                    onToggleRimuovi={() => {
                      setSlotAperto((cur) => (cur === idx ? null : idx));
                      setSlotEvidenziato(null);
                    }}
                    onToggleSostituti={() => {
                      setSlotEvidenziato((cur) => (cur === idx ? null : idx));
                      setSlotAperto(null);
                    }}
                    onRimuovi={() => rimuovi(idx)}
                    onDragStart={() => iniziaTrascinamentoCampo(assegnazione[idx] as string, idx)}
                    onDragEnd={fineTrascinamento}
                    onDragOver={(e) => dragOverSlot(e, idx)}
                    onDrop={(e) => dropSuSlot(e, idx)}
                    compatibile={compatibilitaSlot(idx)}
                  />
                ))}
              </div>
            ))}
          </div>

          <div
            data-bench-drop
            className={`lg:w-56 shrink-0 rounded-lg p-2 transition ${
              trascinamento && trascinamento.origine !== null ? "ring-2 ring-blue-400 bg-slate-800/60" : ""
            }`}
            onDragOver={dragOverPanchina}
            onDrop={dropSuPanchina}
          >
            <h3 className="text-white/70 text-xs uppercase mb-2">Panchina ({panchina.length})</h3>
            {panchina.length === 0 ? (
              <p className="text-white/40 text-xs">Nessun giocatore in panchina.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {panchina.map((p) => {
                  const sostitutoDelloSlotEvidenziato =
                    slotEvidenziato !== null && ruoliCompatibiliConSlot(p, modulo.slot[slotEvidenziato]);
                  return (
                    <CartaPanchina
                      key={p.id}
                      player={p}
                      onDragStart={() => iniziaTrascinamentoPanchina(p.id)}
                      onDragEnd={fineTrascinamento}
                      evidenziato={sostitutoDelloSlotEvidenziato}
                      attenuato={slotEvidenziato !== null && !sostitutoDelloSlotEvidenziato}
                      onClick={sostitutoDelloSlotEvidenziato ? () => scegliDaPanchina(p.id) : undefined}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
