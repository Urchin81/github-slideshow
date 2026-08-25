"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { Gavel } from "lucide-react";
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
import { computeMantraStato, getSuggestions, PlayerSuggestion, simulaAcquisto, valutaRischioSforamento } from "@/lib/suggestions";
import { classeLivello } from "@/lib/livelloColori";
import { useAuctionStore } from "@/lib/store";
import { FavoriteStar } from "./FavoriteStar";
import { CARATTERISTICHE, CaratteristicheGiocatore } from "./CaratteristicheGiocatore";

type FiltroStato = "disponibile" | StatoGiocatore | "tutti";
type RoleKey = Ruolo | RuoloMantra;

// "Ordina per: Bilanciato" (solo Mantra): combina quanto e' buono il valore
// atteso del giocatore (70%, in assenza di un percentile numerico si usa il
// livello a 5 fasce gia' calcolato) con quanto aiuta a completare i moduli
// piu' vicini (30%) — sempre spiegato nel tooltip, mai un numero opaco.
const LIVELLO_VALORE_SCORE: Record<string, number> = {
  super: 100,
  buono: 75,
  sufficiente: 50,
  mediocre: 25,
  negativo: 0,
};

function punteggioBilanciato(s: PlayerSuggestion | undefined): number {
  if (!s) return 0;
  const valoreScore = s.livelloValoreAtteso ? LIVELLO_VALORE_SCORE[s.livelloValoreAtteso] ?? 0 : 0;
  const moduliScore = (s.moduliUtili?.length ?? 0) > 0 ? 100 : 0;
  return valoreScore * 0.7 + moduliScore * 0.3;
}

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
  const [inAstaId, setInAstaId] = useState<string | null>(null);
  const [caratteristicaFiltro, setCaratteristicaFiltro] = useState<string | null>(null);
  const [ordinamento, setOrdinamento] = useState<"convenienza" | "valoreAtteso" | "bilanciato">("convenienza");

  function toggleCaratteristicaFiltro(chiave: string) {
    setCaratteristicaFiltro((attuale) => (attuale === chiave ? null : chiave));
  }

  const suggestions = useMemo(() => getSuggestions(players, settings), [players, settings]);
  const suggestionById = useMemo(() => {
    const map = new Map(suggestions.map((s) => [s.player.id, s]));
    return map;
  }, [suggestions]);

  // Giocatore attualmente "sotto il martello": resta valido solo finché è ancora
  // disponibile (appena viene assegnato o rimosso si torna automaticamente alla lista intera).
  const inAstaPlayer = useMemo(() => {
    if (!inAstaId) return null;
    const p = players.find((pl) => pl.id === inAstaId);
    return p && p.stato === "disponibile" ? p : null;
  }, [inAstaId, players]);

  function ruoliCompatibili(a: typeof players[number], b: typeof players[number]) {
    return isMantra
      ? (a.ruoliMantra ?? []).some((r) => (b.ruoliMantra ?? []).includes(r))
      : a.ruolo === b.ruolo;
  }

  const righe = useMemo(() => {
    if (inAstaPlayer) {
      const compatibili = players
        .filter((p) => p.id !== inAstaPlayer.id && p.stato === "disponibile" && ruoliCompatibili(p, inAstaPlayer))
        .sort((a, b) => (suggestionById.get(b.id)?.punteggio ?? 0) - (suggestionById.get(a.id)?.punteggio ?? 0));
      return [inAstaPlayer, ...compatibili];
    }

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
    if (caratteristicaFiltro) {
      const caratteristica = CARATTERISTICHE.find((c) => c.chiave === caratteristicaFiltro);
      if (caratteristica) base = base.filter((p) => caratteristica.presente(p));
    }

    return [...base].sort((a, b) => {
      if (statoFiltro !== "disponibile") return b.quotazione - a.quotazione;
      if (ordinamento === "valoreAtteso") {
        const va = suggestionById.get(a.id)?.valoreAtteso?.totale ?? -Infinity;
        const vb = suggestionById.get(b.id)?.valoreAtteso?.totale ?? -Infinity;
        return vb - va;
      }
      if (ordinamento === "bilanciato") {
        return punteggioBilanciato(suggestionById.get(b.id)) - punteggioBilanciato(suggestionById.get(a.id));
      }
      const sa = suggestionById.get(a.id)?.punteggio ?? 0;
      const sb = suggestionById.get(b.id)?.punteggio ?? 0;
      return sb - sa;
    });
  }, [
    players,
    statoFiltro,
    ruoloFiltro,
    ricerca,
    soloConsigliati,
    soloPreferiti,
    caratteristicaFiltro,
    suggestionById,
    isMantra,
    inAstaPlayer,
    ordinamento,
  ]);

  const mostraPunteggio = statoFiltro === "disponibile" || !!inAstaPlayer;

  // Simulazione live del prezzo mentre si digita nel box "Preso da me": nessun
  // effetto sullo stato reale, solo una proiezione budget/slot prima-dopo.
  const simulazione = useMemo(
    () => (assignId ? simulaAcquisto(players, settings, assignId, Number(prezzoInput) || 1) : null),
    [assignId, prezzoInput, players, settings]
  );

  function apriAssegnazione(id: string, quotazione: number) {
    setAssignId(id);
    setPrezzoInput(String(quotazione || 1));
  }

  function handleConferma(id: string) {
    const prezzo = Math.max(1, Number(prezzoInput) || 1);
    assignToMe(id, prezzo);
    setAssignId(null);
    setPrezzoInput("1");
    if (id === inAstaId) setInAstaId(null);
  }

  function handleAssignToOthers(id: string) {
    assignToOthers(id);
    if (id === inAstaId) setInAstaId(null);
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
      {inAstaPlayer ? (
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-amber-50 border border-amber-200 rounded p-2.5 text-sm">
          <Gavel size={16} className="text-amber-700 shrink-0" />
          <span>
            Giocatore in asta: <strong>{inAstaPlayer.nome}</strong> — sotto, i giocatori con ruoli compatibili
            ancora disponibili.
          </span>
          {(() => {
            const s = suggestionById.get(inAstaPlayer.id);
            if (!s) return null;
            return (
              <span
                className="text-xs bg-white border border-amber-200 rounded px-2 py-1"
                title="Max consigliato: soglia oltre la quale il giocatore smette di essere conveniente per il budget residuo. Tetto: oltre questo prezzo non basterebbe almeno 1 a testa per gli slot/posti ancora da riempire."
              >
                Max consigliato <strong>{Math.round(s.prezzoMassimo.massimoConsigliato)}</strong>
                <span className="text-slate-400"> · tetto {Math.round(s.prezzoMassimo.tettoSicurezza)}</span>
              </span>
            );
          })()}
          <button
            onClick={() => setInAstaId(null)}
            className="ml-auto text-xs bg-slate-200 rounded px-2 py-1 hover:bg-slate-300"
          >
            Torna alla lista completa
          </button>
        </div>
      ) : (
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
            <select
              value={ordinamento}
              onChange={(e) => setOrdinamento(e.target.value as typeof ordinamento)}
              title="Ordina per"
              className="border border-slate-200 rounded px-2 py-1.5 text-sm"
            >
              <option value="convenienza">Ordina: Convenienza</option>
              <option value="valoreAtteso">Ordina: Valore atteso</option>
              {isMantra && <option value="bilanciato">Ordina: Bilanciato</option>}
            </select>
          )}
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
          {caratteristicaFiltro && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-slate-900 text-white rounded-full pl-2.5 pr-1 py-1">
              {CARATTERISTICHE.find((c) => c.chiave === caratteristicaFiltro)?.label ?? caratteristicaFiltro}
              <button
                onClick={() => setCaratteristicaFiltro(null)}
                title="Rimuovi il filtro per caratteristica"
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-slate-700"
              >
                ✕
              </button>
            </span>
          )}
          <span className="text-sm text-slate-400 ml-auto">{righe.length} giocatori</span>
        </div>
      )}

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
              {mostraPunteggio && <th className="pb-2 text-right">Punteggio</th>}
              {mostraPunteggio && <th className="pb-2 text-right">Valore atteso</th>}
              <th className="pb-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {righe.map((p) => {
              const suggestion = suggestionById.get(p.id);
              return (
                <Fragment key={p.id}>
                <tr className="hover:bg-slate-50">
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
                  {mostraPunteggio && (
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
                    </td>
                  )}
                  {mostraPunteggio && (
                    <td className="py-1.5 text-right">
                      {suggestion?.valoreAtteso ? (
                        <span
                          className={`inline-flex items-center justify-center min-w-[2.5rem] px-1.5 py-0.5 rounded-full text-xs font-semibold ${classeLivello(
                            suggestion.livelloValoreAtteso ?? null
                          )}`}
                          title={`Stima punti stagione: ${Math.round(suggestion.valoreAtteso.puntiMediaVoto)} media voto + ${Math.round(suggestion.valoreAtteso.puntiGol)} gol + ${Math.round(suggestion.valoreAtteso.puntiAssist)} assist - ${Math.round(-suggestion.valoreAtteso.puntiMalus)} malus (confidenza ${suggestion.valoreAtteso.confidenza})`}
                        >
                          {Math.round(suggestion.valoreAtteso.totale)}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs" title="Nessun dato FPEDIA per questo giocatore">
                          —
                        </span>
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
                          {suggestion && (
                            <span className="text-[10px] text-slate-400">
                              max {Math.round(suggestion.prezzoMassimo.massimoConsigliato)}
                            </span>
                          )}
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
                      ) : inAstaPlayer && p.id === inAstaPlayer.id ? (
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
                            onClick={() => handleAssignToOthers(p.id)}
                            className="text-xs bg-slate-200 rounded px-2 py-1"
                          >
                            Preso da altri
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setInAstaId(p.id)}
                          title="Giocatore in asta: mostra i giocatori con ruoli compatibili ancora disponibili"
                          className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-slate-100 text-slate-600"
                        >
                          <Gavel size={16} />
                        </button>
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
                                className="text-sm px-1"
                                title="Modifica prezzo"
                              >
                                ✏️
                              </button>
                            </>
                          ))}
                        {modificaId !== p.id && (
                          <button
                            onClick={() => confermaRimozione(p.nome, p.prezzoPagato, p.id)}
                            className="text-sm text-red-600 hover:text-red-700 px-1"
                            title="Rimuovi dalla rosa"
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
                {assignId === p.id ? (
                  <tr className="border-b border-slate-50">
                    <td />
                    <td />
                    <td colSpan={mostraPunteggio ? 5 : 3} className="pb-1.5">
                      {suggestion &&
                        (() => {
                          const rischio = valutaRischioSforamento(Number(prezzoInput) || 0, suggestion.prezzoMassimo);
                          if (rischio.livello === "ok") return null;
                          return (
                            <p
                              className={`mb-1.5 text-xs rounded px-2 py-1 border ${
                                rischio.livello === "sforamento"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {rischio.livello === "sforamento" ? "⛔" : "⚠️"} {rischio.messaggio}
                            </p>
                          );
                        })()}
                      {simulazione && (
                        <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs space-y-1">
                          <p className="text-slate-400 uppercase">Simulazione a {simulazione.prezzo}</p>
                          <div className="flex justify-between">
                            <span>Budget residuo</span>
                            <span>
                              {simulazione.budgetResiduoAttuale} → <strong>{simulazione.budgetResiduoSimulato}</strong>
                            </span>
                          </div>
                          {simulazione.roleStatsSimulato && simulazione.roleStatsAttuale && (
                            <>
                              <div className="flex justify-between">
                                <span>Slot {RUOLO_LABEL[p.ruolo]} rimanenti</span>
                                <span>
                                  {simulazione.roleStatsAttuale.slotRimanenti} →{" "}
                                  <strong>{simulazione.roleStatsSimulato.slotRimanenti}</strong>
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Media/slot dopo</span>
                                <span>{Math.round(simulazione.roleStatsSimulato.prezzoMedioDisponibile)}</span>
                              </div>
                            </>
                          )}
                          {simulazione.mantraStatoSimulato && simulazione.mantraStatoAttuale && (
                            <>
                              <div className="flex justify-between">
                                <span>Posti rimanenti</span>
                                <span>
                                  {simulazione.mantraStatoAttuale.postiRimanenti} →{" "}
                                  <strong>{simulazione.mantraStatoSimulato.postiRimanenti}</strong>
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Media/posto dopo</span>
                                <span>{Math.round(simulazione.mantraStatoSimulato.prezzoMedioDisponibile)}</span>
                              </div>
                              {suggestion?.moduliUtili && suggestion.moduliUtili.length > 0 && (
                                <p className="text-slate-500">Aiuta a completare: {suggestion.moduliUtili.join(", ")}</p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td />
                  </tr>
                ) : (
                  <tr className="border-b border-slate-50">
                    <td />
                    <td />
                    <td colSpan={2} className="pb-1.5">
                      <CaratteristicheGiocatore
                        player={p}
                        className="justify-between w-full bg-slate-100 rounded px-2 py-1"
                        caratteristicaAttiva={caratteristicaFiltro}
                        onSelezionaCaratteristica={toggleCaratteristicaFiltro}
                      />
                    </td>
                    <td />
                    {mostraPunteggio && <td />}
                    {mostraPunteggio && <td />}
                    <td />
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
