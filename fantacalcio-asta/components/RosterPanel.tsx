"use client";

import Link from "next/link";
import { useState } from "react";
import { Armchair, EllipsisVertical } from "lucide-react";
import {
  LINEE_MANTRA,
  lineaMantraGiocatore,
  Player,
  RUOLI,
  RUOLO_COLORE,
  RUOLO_LABEL,
  RUOLO_MANTRA_COLORE,
} from "@/lib/types";
import { useAuctionStore } from "@/lib/store";
import { FavoriteStar } from "./FavoriteStar";

/** Bottone panchina: numero di avversari dello stesso ballottaggio ancora disponibili, click = filtra PlayerTable su di loro. */
function BadgeBallottaggio({
  id,
  ballottaggio,
  players,
  onFiltraBallottaggio,
}: {
  id: string;
  ballottaggio: Player["ballottaggio"];
  players: Player[];
  onFiltraBallottaggio: (id: string) => void;
}) {
  const disponibili = ballottaggio
    ? ballottaggio.avversari.filter((a) => players.find((p) => p.id === a.playerId)?.stato === "disponibile").length
    : 0;
  const attivo = disponibili > 0;

  return (
    <button
      onClick={attivo ? () => onFiltraBallottaggio(id) : undefined}
      disabled={!attivo}
      className={`relative inline-flex items-center justify-center w-6 h-6 rounded shrink-0 ${
        attivo ? "hover:bg-slate-100 cursor-pointer" : "cursor-default"
      }`}
      title={
        attivo
          ? `${disponibili} avversari del ballottaggio ancora disponibili — clicca per filtrarli`
          : "Nessun sostituto in ballottaggio ancora disponibile"
      }
    >
      <Armchair size={14} className={attivo ? "text-slate-600" : "text-slate-300"} />
      {attivo && (
        <span className="absolute -top-1 -right-1 bg-slate-700 text-white text-[9px] leading-none rounded-full min-w-[14px] h-[14px] px-0.5 flex items-center justify-center font-bold">
          {disponibili}
        </span>
      )}
    </button>
  );
}

function RigaGiocatore({
  id,
  nome,
  squadra,
  prezzoPagato,
  preferito,
  ballottaggio,
  players,
  onFiltraBallottaggio,
  extra,
}: {
  id: string;
  nome: string;
  squadra: string;
  prezzoPagato?: number;
  preferito?: boolean;
  ballottaggio: Player["ballottaggio"];
  players: Player[];
  onFiltraBallottaggio: (id: string) => void;
  extra?: React.ReactNode;
}) {
  const resetPlayer = useAuctionStore((s) => s.resetPlayer);
  const assignToMe = useAuctionStore((s) => s.assignToMe);
  const [modifica, setModifica] = useState(false);
  const [azioniAperte, setAzioniAperte] = useState(false);
  const [prezzoInput, setPrezzoInput] = useState(String(prezzoPagato ?? 1));

  function confermaRimozione() {
    if (confirm(`Rimuovere ${nome} dalla tua rosa? Il prezzo pagato (${prezzoPagato}) andrà perso.`)) {
      resetPlayer(id);
    }
  }

  function salvaPrezzo() {
    assignToMe(id, Math.max(1, Number(prezzoInput) || 1));
    setModifica(false);
  }

  return (
    <li className="flex justify-between items-center gap-1">
      <span className="flex items-center gap-1.5 min-w-0 truncate">
        <FavoriteStar id={id} preferito={preferito} />
        <Link href={`/giocatore/${encodeURIComponent(id)}`} className="hover:underline truncate">
          {nome}
        </Link>{" "}
        <span className="text-slate-400 shrink-0" title={squadra}>
          ({squadra.slice(0, 3).toUpperCase()})
        </span>
        {extra}
      </span>
      <span className="flex items-center gap-1 shrink-0">
        <BadgeBallottaggio id={id} ballottaggio={ballottaggio} players={players} onFiltraBallottaggio={onFiltraBallottaggio} />
        {modifica ? (
          <>
            <input
              type="number"
              min={1}
              value={prezzoInput}
              onChange={(e) => setPrezzoInput(e.target.value)}
              className="w-14 border border-slate-200 rounded px-1 py-0.5 text-xs"
              autoFocus
            />
            <button
              onClick={salvaPrezzo}
              className="text-xs bg-green-600 text-white rounded px-1.5 py-0.5 hover:bg-green-700"
              title="Salva prezzo"
            >
              ✓
            </button>
            <button
              onClick={() => {
                setModifica(false);
                setPrezzoInput(String(prezzoPagato ?? 1));
              }}
              className="text-xs text-slate-400 hover:text-slate-600 px-1"
              title="Annulla modifica"
            >
              ✕
            </button>
          </>
        ) : (
          <>
            <span className="font-medium">{prezzoPagato}</span>
            {azioniAperte && (
              <>
                <button onClick={() => setModifica(true)} className="text-sm px-0.5" title="Modifica prezzo">
                  ✏️
                </button>
                <button
                  onClick={confermaRimozione}
                  className="text-sm text-red-600 hover:text-red-700 px-0.5"
                  title="Rimuovi dalla rosa"
                >
                  ✕
                </button>
              </>
            )}
            <button
              onClick={() => setAzioniAperte((a) => !a)}
              className={`px-0.5 ${azioniAperte ? "text-slate-600" : "text-slate-300 hover:text-slate-500"}`}
              title="Azioni"
            >
              <EllipsisVertical size={14} />
            </button>
          </>
        )}
      </span>
    </li>
  );
}

function RosterClassic({ onFiltraBallottaggio }: { onFiltraBallottaggio: (id: string) => void }) {
  const players = useAuctionStore((s) => s.players);
  const mine = players.filter((p) => p.stato === "mia");

  return (
    <div className="space-y-3">
      {RUOLI.map((ruolo) => {
        const list = mine.filter((p) => p.ruolo === ruolo);
        if (list.length === 0) return null;
        return (
          <div key={ruolo}>
            <h3 className="text-xs uppercase text-slate-400 mb-1 flex items-center gap-1.5">
              <span
                className="text-white rounded px-1 normal-case"
                style={{ backgroundColor: RUOLO_COLORE[ruolo] }}
              >
                {ruolo}
              </span>
              {RUOLO_LABEL[ruolo]}
            </h3>
            <ul className="text-sm space-y-1">
              {list.map((p) => (
                <RigaGiocatore
                  key={p.id}
                  id={p.id}
                  nome={p.nome}
                  squadra={p.squadra}
                  prezzoPagato={p.prezzoPagato}
                  preferito={p.preferito}
                  ballottaggio={p.ballottaggio}
                  players={players}
                  onFiltraBallottaggio={onFiltraBallottaggio}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function RosterMantra({ onFiltraBallottaggio }: { onFiltraBallottaggio: (id: string) => void }) {
  const players = useAuctionStore((s) => s.players);
  const mine = players.filter((p) => p.stato === "mia");

  // Portieri in alto, poi linea difensiva, centrale e offensiva: un giocatore
  // multi-ruolo va nella prima linea che uno dei suoi ruoli copre.
  const gruppi = LINEE_MANTRA.map((linea) => ({
    linea,
    list: [...mine.filter((p) => lineaMantraGiocatore(p.ruoliMantra) === linea)].sort(
      (a, b) => b.quotazione - a.quotazione
    ),
  }));
  const senzaRuolo = [...mine.filter((p) => !lineaMantraGiocatore(p.ruoliMantra))].sort(
    (a, b) => b.quotazione - a.quotazione
  );

  function riga(p: (typeof mine)[number]) {
    return (
      <RigaGiocatore
        key={p.id}
        id={p.id}
        nome={p.nome}
        squadra={p.squadra}
        prezzoPagato={p.prezzoPagato}
        preferito={p.preferito}
        ballottaggio={p.ballottaggio}
        players={players}
        onFiltraBallottaggio={onFiltraBallottaggio}
        extra={
          <span className="ml-1">
            {(p.ruoliMantra ?? []).map((r) => (
              <span
                key={r}
                className="text-[10px] text-white rounded px-1 mr-0.5"
                style={{ backgroundColor: RUOLO_MANTRA_COLORE[r] }}
              >
                {r}
              </span>
            ))}
          </span>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {gruppi.map(({ linea, list }) => {
        if (list.length === 0) return null;
        return (
          <div key={linea}>
            <h3 className="text-xs uppercase text-slate-400 mb-1">{linea}</h3>
            <ul className="text-sm space-y-1">{list.map(riga)}</ul>
          </div>
        );
      })}
      {senzaRuolo.length > 0 && (
        <div>
          <h3 className="text-xs uppercase text-slate-400 mb-1">Senza ruolo Mantra indicato</h3>
          <ul className="text-sm space-y-1">{senzaRuolo.map(riga)}</ul>
        </div>
      )}
    </div>
  );
}

export function RosterPanel({ onFiltraBallottaggio }: { onFiltraBallottaggio: (id: string) => void }) {
  const players = useAuctionStore((s) => s.players);
  const settings = useAuctionStore((s) => s.settings);
  const mine = players.filter((p) => p.stato === "mia");

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold text-lg mb-3">La mia rosa ({mine.length})</h2>
      {mine.length === 0 && <p className="text-slate-400 text-sm">Nessun giocatore preso ancora.</p>}
      {settings.modalita === "classic" ? (
        <RosterClassic onFiltraBallottaggio={onFiltraBallottaggio} />
      ) : (
        <RosterMantra onFiltraBallottaggio={onFiltraBallottaggio} />
      )}
    </div>
  );
}
