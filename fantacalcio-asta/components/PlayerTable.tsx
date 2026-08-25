"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  RUOLI,
  RUOLI_MANTRA,
  RUOLO_COLORE,
  RUOLO_LABEL,
  RUOLO_MANTRA_COLORE,
  RUOLO_MANTRA_LABEL,
  RuoloMantra,
  Ruolo,
  StatoGiocatore,
} from "@/lib/types";
import { computeMantraStato, getSuggestions } from "@/lib/suggestions";
import { useAuctionStore } from "@/lib/store";
import { FavoriteStar } from "./FavoriteStar";

type FiltroStato = "disponibile" | StatoGiocatore | "tutti";
type RoleKey = Ruolo | RuoloMantra;

export function PlayerTable() {
  const players = useAuctionStore((s) => s.players);
  const settings = useAuctionStore((s) => s.settings);
  const assignToMe = useAuctionStore((s) => s.assignToMe);
  const assignToOthers = useAuctionStore((s) => s.assignToOthers);
  const resetPlayer = useAuctionStore((s) => s.resetPlayer);
  const isMantra = settings.modalita === "mantra";
  const ruoliAttivi: RoleKey[] = isMantra ? RUOLI_MANTRA : RUOLI;
  const statoMantra = useMemo(() => (isMantra ? computeMantraStato(players, settings) : null), [
    isMantra,
    players,
    settings,
  ]);
  const rosaPiena = statoMantra !== null && statoMantra.postiRimanenti <= 0;

  const [ruoloFiltro, setRuoloFiltro] = useState<RoleKey | "tutti">("tutti");
  const [statoFiltro, setStatoFiltro] = useState<FiltroStato>("disponibile");
  const [ricerca, setRicerca] = useState("");
  const [soloConsigliati, setSoloConsigliati] = useState(false);
  const [soloPreferiti, setSoloPreferiti] = useState(false);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [prezzoInput, setPrezzoInput] = useState("1");
  const [modificaId, setModificaId] = useState<string | null>(null);
  const [modificaInput, setModificaInput] = useState("1");

  const suggestions = useMemo(() => getSuggestions(players, settings), [players, settings]);
  const suggestionById = useMemo(() => {
    const map = new Map(suggestions.map((s) => [s.player.id, s]));
    return map;
  }, [suggestions]);

  const righe = useMemo(() => {
    let base = statoFiltro === "tutti" ? players : players.filter((p) => p.stato === statoFiltro);

    if (ruoloFiltro !== "tutti") {
      base = base.filter((p) =>
        isMantra ? (p.ruoliMantra ?? []).includes(ruoloFiltro as RuoloMantra) : p.ruolo === ruoloFiltro
      );
    }
    if (ricerca.trim()) {
      const q = ricerca.trim().toLowerCase();
      base = base.filter((p) => p.nome.toLowerCase().includes(q) || p.squadra.toLowerCase().includes(q));
    }
    if (soloConsigliati && statoFiltro === "disponibile") {
      base = base.filter((p) => suggestionById.get(p.id)?.consigliato);
    }
    if (soloPreferiti) {
      base = base.filter((p) => p.preferito);
    }

    return [...base].sort((a, b) => {
      if (statoFiltro !== "disponibile") return b.quotazione - a.quotazione;
      const sa = suggestionById.get(a.id)?.punteggio ?? 0;
      const sb = suggestionById.get(b.id)?.punteggio ?? 0;
      return sb - sa;
    });
  }, [players, statoFiltro, ruoloFiltro, ricerca, soloConsigliati, soloPreferiti, suggestionById, isMantra]);

  function apriAssegnazione(id: string, quotazione: number) {
    setAssignId(id);
    setPrezzoInput(String(quotazione || 1));
  }

  function handleConferma(id: string) {
    const prezzo = Math.max(1, Number(prezzoInput) || 1);
    assignToMe(id, prezzo);
    setAssignId(null);
    setPrezzoInput("1");
  }

  function apriModifica(id: string, prezzoAttuale: number | undefined) {
    setModificaId(id);
    setModificaInput(String(prezzoAttuale ?? 1));
  }

  function salvaModifica(id: string) {
    assignToMe(id, Math.max(1, Number(modificaInput) || 1));
    setModificaId(null);
  }

  function confermaRimozione(nome: string, prezzoPagato: number | undefined, id: string) {
    const messaggio =
      prezzoPagato !== undefined
        ? `Rimuovere ${nome} dalla tua rosa? Il prezzo pagato (${prezzoPagato}) andrà perso.`
        : `Rimettere ${nome} tra i disponibili?`;
    if (confirm(messaggio)) resetPlayer(id);
  }

  function ruoloLabel(r: RoleKey) {
    return isMantra ? RUOLO_MANTRA_LABEL[r as RuoloMantra] : RUOLO_LABEL[r as Ruolo];
  }

  function celleRuolo(playerRuolo: Ruolo, ruoliMantra: RuoloMantra[] | undefined) {
    if (!isMantra) {
      return (
        <span
          className="text-white rounded px-1 text-xs"
          style={{ backgroundColor: RUOLO_COLORE[playerRuolo] }}
        >
          {playerRuolo}
        </span>
      );
    }
    if (!ruoliMantra || ruoliMantra.length === 0) return <span className="text-slate-300">—</span>;
    return (
      <span className="flex gap-1 flex-wrap">
        {ruoliMantra.map((r) => (
          <span key={r} className="text-white rounded px-1 text-xs" style={{ backgroundColor: RUOLO_MANTRA_COLORE[r] }}>
            {r}
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
          placeholder="Cerca giocatore o squadra..."
          className="border border-slate-200 rounded px-3 py-1.5 text-sm flex-1 min-w-[200px]"
        />
        <select
          value={ruoloFiltro}
          onChange={(e) => setRuoloFiltro(e.target.value as RoleKey | "tutti")}
          className="border border-slate-200 rounded px-2 py-1.5 text-sm"
        >
          <option value="tutti">Tutti i ruoli</option>
          {ruoliAttivi.map((r) => (
            <option key={r} value={r}>
              {isMantra ? `${r} - ${ruoloLabel(r)}` : ruoloLabel(r)}
            </option>
          ))}
        </select>
        <select
          value={statoFiltro}
          onChange={(e) => setStatoFiltro(e.target.value as FiltroStato)}
          className="border border-slate-200 rounded px-2 py-1.5 text-sm"
        >
          <option value="disponibile">Disponibili</option>
          <option value="mia">Mia squadra</option>
          <option value="altrui">Prese da altri</option>
          <option value="tutti">Tutti</option>
        </select>
        {statoFiltro === "disponibile" && (
          <label className="text-sm flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={soloConsigliati}
              onChange={(e) => setSoloConsigliati(e.target.checked)}
            />
            Solo consigliati
          </label>
        )}
        <label className="text-sm flex items-center gap-1.5">
          <input type="checkbox" checked={soloPreferiti} onChange={(e) => setSoloPreferiti(e.target.checked)} />
          Solo preferiti ★
        </label>
        <span className="text-sm text-slate-400 ml-auto">{righe.length} giocatori</span>
      </div>

      {rosaPiena && (
        <p className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded p-2 mb-3">
          Hai raggiunto il numero massimo di giocatori acquistabili ({statoMantra?.max}): &quot;Preso da me&quot; è
          disabilitato.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="pb-2">★</th>
              <th className="pb-2">Ruolo</th>
              <th className="pb-2">Nome</th>
              <th className="pb-2">Squadra</th>
              <th className="pb-2 text-right">Quot.</th>
              {statoFiltro === "disponibile" && <th className="pb-2 text-right">Punteggio</th>}
              <th className="pb-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {righe.map((p) => {
              const suggestion = suggestionById.get(p.id);
              return (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-1.5">
                    <FavoriteStar id={p.id} preferito={p.preferito} />
                  </td>
                  <td className="py-1.5">{celleRuolo(p.ruolo, p.ruoliMantra)}</td>
                  <td className="py-1.5 font-medium">
                    <Link href={`/giocatore/${encodeURIComponent(p.id)}`} className="hover:underline">
                      {p.nome}
                    </Link>
                  </td>
                  <td className="py-1.5 text-slate-500">{p.squadra}</td>
                  <td className="py-1.5 text-right">{p.quotazione}</td>
                  {statoFiltro === "disponibile" && (
                    <td className="py-1.5 text-right">
                      {suggestion?.consigliato ? (
                        <span
                          className="text-green-600 font-semibold"
                          title="Consigliato: quotazione/FVM conveniente rispetto al budget medio ancora disponibile per questo ruolo (non più del +30%) e c'è ancora posto libero da riempire in rosa."
                        >
                          {Math.round(suggestion.punteggio)} ✓
                        </span>
                      ) : (
                        <span className="text-slate-400">{Math.round(suggestion?.punteggio ?? 0)}</span>
                      )}
                      {suggestion?.moduliUtili && suggestion.moduliUtili.length > 0 && (
                        <div className="text-[10px] text-slate-400">utile: {suggestion.moduliUtili.join(", ")}</div>
                      )}
                    </td>
                  )}
                  <td className="py-1.5 text-right">
                    {p.stato === "disponibile" ? (
                      assignId === p.id ? (
                        <span className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            value={prezzoInput}
                            onChange={(e) => setPrezzoInput(e.target.value)}
                            className="w-16 border border-slate-200 rounded px-1 py-0.5"
                            autoFocus
                          />
                          <button
                            onClick={() => handleConferma(p.id)}
                            className="text-xs bg-green-600 text-white rounded px-2 py-1"
                          >
                            OK
                          </button>
                          <button onClick={() => setAssignId(null)} className="text-xs text-slate-400">
                            X
                          </button>
                        </span>
                      ) : (
                        <span className="inline-flex gap-2">
                          <button
                            onClick={() => apriAssegnazione(p.id, p.quotazione)}
                            disabled={rosaPiena}
                            title={rosaPiena ? "Numero massimo di giocatori raggiunto" : undefined}
                            className="text-xs bg-slate-900 text-white rounded px-2 py-1 disabled:opacity-40"
                          >
                            Preso da me
                          </button>
                          <button
                            onClick={() => assignToOthers(p.id)}
                            className="text-xs bg-slate-200 rounded px-2 py-1"
                          >
                            Preso da altri
                          </button>
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        {p.stato === "mia" &&
                          (modificaId === p.id ? (
                            <>
                              <input
                                type="number"
                                min={1}
                                value={modificaInput}
                                onChange={(e) => setModificaInput(e.target.value)}
                                className="w-14 border border-slate-200 rounded px-1 py-0.5"
                                autoFocus
                              />
                              <button
                                onClick={() => salvaModifica(p.id)}
                                className="text-xs bg-green-600 text-white rounded px-1.5 py-0.5 hover:bg-green-700"
                                title="Salva prezzo"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setModificaId(null)}
                                className="text-xs text-slate-400 hover:text-slate-600 px-1"
                                title="Annulla modifica"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-slate-500">{p.prezzoPagato}</span>
                              <button
                                onClick={() => apriModifica(p.id, p.prezzoPagato)}
                                className="text-xs bg-amber-500 text-white rounded px-1.5 py-0.5 hover:bg-amber-600"
                                title="Modifica prezzo"
                              >
                                ✏️
                              </button>
                            </>
                          ))}
                        {modificaId !== p.id && (
                          <button
                            onClick={() => confermaRimozione(p.nome, p.prezzoPagato, p.id)}
                            className="text-xs bg-red-600 text-white rounded px-1.5 py-0.5 hover:bg-red-700"
                            title="Rimuovi dalla rosa"
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
