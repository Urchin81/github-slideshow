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
import { computeMantraStato, getSuggestions, simulaAcquisto, valutaRischioSforamento } from "@/lib/suggestions";
import { computeLivelliFantasolidita, vociFantasolidita } from "@/lib/fantasolidita";
import { isSafeHttpUrl } from "@/lib/url";
import { useAuctionStore } from "@/lib/store";
import { FavoriteStar } from "./FavoriteStar";
import { CARATTERISTICHE, CaratteristicheGiocatore } from "./CaratteristicheGiocatore";
import { BarraFantasolidita } from "./BarraFantasolidita";
import { BadgeInfortunio } from "./BadgeInfortunio";

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
  const [modificaId, setModificaId] = useState<string | null>(null);
  const [modificaInput, setModificaInput] = useState("1");
  const [inAstaId, setInAstaId] = useState<string | null>(null);
  const [prezzoAstaInput, setPrezzoAstaInput] = useState("0");
  const [caratteristicaFiltro, setCaratteristicaFiltro] = useState<string | null>(null);

  function toggleCaratteristicaFiltro(chiave: string) {
    setCaratteristicaFiltro((attuale) => (attuale === chiave ? null : chiave));
  }

  const suggestions = useMemo(() => getSuggestions(players, settings), [players, settings]);
  const suggestionById = useMemo(() => {
    const map = new Map(suggestions.map((s) => [s.player.id, s]));
    return map;
  }, [suggestions]);
  const livelloFantasolidita = useMemo(() => computeLivelliFantasolidita(players), [players]);

  // Giocatore attualmente "sotto il martello": resta valido solo finché è ancora
  // disponibile (appena viene assegnato o rimosso si torna automaticamente alla lista intera).
  const inAstaPlayer = useMemo(() => {
    if (!inAstaId) return null;
    const p = players.find((pl) => pl.id === inAstaId);
    return p && p.stato === "disponibile" ? p : null;
  }, [inAstaId, players]);
  const astaSuggestion = inAstaPlayer ? suggestionById.get(inAstaPlayer.id) : undefined;

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
  ]);

  const mostraPunteggio = statoFiltro === "disponibile" || !!inAstaPlayer;

  // Simulazione live del prezzo mentre si tiene aperto il box "in asta": nessun
  // effetto sullo stato reale, solo una proiezione budget/slot prima-dopo.
  const simulazione = useMemo(
    () => (inAstaId ? simulaAcquisto(players, settings, inAstaId, Number(prezzoAstaInput) || 1) : null),
    [inAstaId, prezzoAstaInput, players, settings]
  );

  function apriAsta(id: string) {
    setInAstaId(id);
    setPrezzoAstaInput("0");
  }

  function chiudiAsta() {
    setInAstaId(null);
    setPrezzoAstaInput("0");
  }

  function incrementaPrezzoAsta(delta: number) {
    setPrezzoAstaInput((prev) => String(Math.max(0, (Number(prev) || 0) + delta)));
  }

  function handleConfermaMe() {
    if (!inAstaId) return;
    const prezzo = Number(prezzoAstaInput) || 0;
    if (prezzo <= 0) return;
    assignToMe(inAstaId, prezzo);
    chiudiAsta();
  }

  function handleConfermaAltri() {
    if (!inAstaId) return;
    const prezzo = Number(prezzoAstaInput) || 0;
    assignToOthers(inAstaId, prezzo > 0 ? prezzo : undefined);
    chiudiAsta();
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

  function celleFantasolidita(p: (typeof players)[number]) {
    const voci = vociFantasolidita(p);
    if (voci.length === 0) return <span className="text-slate-300">—</span>;
    return (
      <div className="w-36 space-y-0.5">
        {voci.map((v) => (
          <BarraFantasolidita
            key={v.campo}
            label={v.label}
            valore={v.valore}
            livello={livelloFantasolidita(p, v.campo)}
            compatta
          />
        ))}
      </div>
    );
  }

  const prezzoAstaNum = Number(prezzoAstaInput) || 0;
  const rischioAsta = astaSuggestion ? valutaRischioSforamento(prezzoAstaNum, astaSuggestion.prezzoMassimo) : null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {inAstaPlayer ? (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm space-y-3">
          <div className="flex items-center gap-2">
            <Gavel size={16} className="text-amber-700 shrink-0" />
            <span className="font-semibold">Giocatore in asta:</span>
            <Link href={`/giocatore/${encodeURIComponent(inAstaPlayer.id)}`} className="font-semibold hover:underline">
              {inAstaPlayer.nome}
            </Link>
            <button
              onClick={chiudiAsta}
              className="ml-auto text-xs bg-slate-200 rounded px-2 py-1 hover:bg-slate-300"
            >
              Torna alla lista completa
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-white border border-amber-100 rounded p-2.5">
            <span className="relative inline-block shrink-0">
              {isSafeHttpUrl(inAstaPlayer.fpedia?.immagineUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={inAstaPlayer.fpedia?.immagineUrl}
                  alt=""
                  className="w-14 h-14 rounded-full object-contain bg-slate-50 border border-slate-100"
                />
              ) : (
                <span className="inline-block w-14 h-14 rounded-full bg-slate-50 border border-slate-100" />
              )}
              {inAstaPlayer.infortunato && <BadgeInfortunio size={16} />}
            </span>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                {celleRuolo(inAstaPlayer.ruolo, inAstaPlayer.ruoliMantra)}
                <span className="font-medium">{inAstaPlayer.squadra}</span>
                {isSafeHttpUrl(inAstaPlayer.fpedia?.squadraLogoUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={inAstaPlayer.fpedia?.squadraLogoUrl} alt="" className="w-4 h-4 object-contain" />
                )}
              </div>
              <div className="text-xs text-slate-500">
                Quot. <strong>{inAstaPlayer.quotazione}</strong>
                {inAstaPlayer.fvm !== undefined && (
                  <>
                    {" "}
                    · FVM <strong>{inAstaPlayer.fvm}</strong>
                  </>
                )}
                {" "}
                · Titolarità: <strong>{inAstaPlayer.trendVoti ?? "Nessun dato"}</strong>
              </div>
            </div>

            {astaSuggestion && (
              <>
                <div className="text-center">
                  <div className="text-[10px] uppercase text-slate-400 tracking-wide">Punteggio</div>
                  {astaSuggestion.consigliato ? (
                    <div
                      className="text-green-600 font-bold"
                      title="Consigliato: quotazione/FVM conveniente rispetto al budget medio ancora disponibile per questo ruolo (non più del +30%) e c'è ancora posto libero da riempire in rosa."
                    >
                      {Math.round(astaSuggestion.punteggio)} ✓
                    </div>
                  ) : (
                    <div className="text-slate-500 font-bold">{Math.round(astaSuggestion.punteggio)}</div>
                  )}
                </div>
                <span
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1"
                  title="Max consigliato: soglia oltre la quale il giocatore smette di essere conveniente per il budget residuo. Tetto: oltre questo prezzo non basterebbe almeno 1 a testa per gli slot/posti ancora da riempire."
                >
                  Max consigliato <strong>{Math.round(astaSuggestion.prezzoMassimo.massimoConsigliato)}</strong>
                  <span className="text-slate-400"> · tetto {Math.round(astaSuggestion.prezzoMassimo.tettoSicurezza)}</span>
                </span>
              </>
            )}

            {vociFantasolidita(inAstaPlayer).length > 0 && (
              <div className="w-40 space-y-0.5">
                {vociFantasolidita(inAstaPlayer).map((v) => (
                  <BarraFantasolidita
                    key={v.campo}
                    label={v.label}
                    valore={v.valore}
                    livello={livelloFantasolidita(inAstaPlayer, v.campo)}
                    compatta
                  />
                ))}
              </div>
            )}
          </div>

          <CaratteristicheGiocatore
            player={inAstaPlayer}
            className="flex-wrap bg-white border border-amber-100 rounded px-2 py-1.5"
            soloPresenti
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => incrementaPrezzoAsta(-1)}
              className="w-8 h-8 rounded bg-slate-200 hover:bg-slate-300 font-bold text-lg leading-none"
              aria-label="Diminuisci prezzo"
            >
              −
            </button>
            <input
              type="number"
              min={0}
              value={prezzoAstaInput}
              onChange={(e) => setPrezzoAstaInput(e.target.value)}
              className="w-20 text-center border border-slate-200 rounded px-1 py-1.5 font-semibold"
            />
            <button
              onClick={() => incrementaPrezzoAsta(1)}
              className="w-8 h-8 rounded bg-slate-200 hover:bg-slate-300 font-bold text-lg leading-none"
              aria-label="Aumenta prezzo"
            >
              +
            </button>

            <button
              onClick={handleConfermaMe}
              disabled={rosaPiena || prezzoAstaNum <= 0}
              title={
                rosaPiena
                  ? "Numero massimo di giocatori raggiunto"
                  : prezzoAstaNum <= 0
                  ? "Inserisci un prezzo maggiore di zero"
                  : undefined
              }
              className="text-sm bg-slate-900 text-white rounded px-3 py-1.5 disabled:opacity-40"
            >
              Preso da me
            </button>
            <button
              onClick={handleConfermaAltri}
              className="text-sm bg-slate-200 rounded px-3 py-1.5 hover:bg-slate-300"
              title="Il prezzo è facoltativo: se lo indichi resta visibile in tabella, utile per seguire l'andamento delle puntate."
            >
              Preso da altri
            </button>
          </div>

          {rischioAsta && rischioAsta.livello !== "ok" && (
            <p
              className={`text-xs rounded px-2 py-1 border ${
                rischioAsta.livello === "sforamento"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-amber-100 text-amber-700 border-amber-300"
              }`}
            >
              {rischioAsta.livello === "sforamento" ? "⛔" : "⚠️"} {rischioAsta.messaggio}
            </p>
          )}

          {simulazione && (
            <div className="bg-white border border-amber-100 rounded p-2 text-xs space-y-1">
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
                    <span>Slot {RUOLO_LABEL[inAstaPlayer.ruolo]} rimanenti</span>
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
                  {astaSuggestion?.moduliUtili && astaSuggestion.moduliUtili.length > 0 && (
                    <p className="text-slate-500">Aiuta a completare: {astaSuggestion.moduliUtili.join(", ")}</p>
                  )}
                </>
              )}
            </div>
          )}
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

      <div className="overflow-auto max-h-[75vh]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 [&>th]:sticky [&>th]:top-0 [&>th]:bg-white [&>th]:z-10 [&>th]:border-b [&>th]:border-slate-100">
              <th className="pb-2">★</th>
              <th className="pb-2">Ruolo</th>
              <th className="pb-2">Foto</th>
              <th className="pb-2">Nome</th>
              <th className="pb-2">Squadra</th>
              <th className="pb-2">Fantasolidità/rischi</th>
              <th className="pb-2 text-right">Quot.</th>
              {mostraPunteggio && <th className="pb-2 text-right">Punteggio</th>}
              <th className="pb-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {righe.map((p) => {
              const suggestion = suggestionById.get(p.id);
              const inAsta = inAstaPlayer?.id === p.id;
              return (
                <Fragment key={p.id}>
                <tr className={inAsta ? "bg-amber-50/60" : "hover:bg-slate-50"}>
                  <td className="py-1.5">
                    <FavoriteStar id={p.id} preferito={p.preferito} />
                  </td>
                  <td className="py-1.5">{celleRuolo(p.ruolo, p.ruoliMantra)}</td>
                  <td className="py-1.5">
                    <span className="relative inline-block">
                      {isSafeHttpUrl(p.fpedia?.immagineUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.fpedia?.immagineUrl}
                          alt=""
                          className="w-8 h-8 rounded-full object-contain bg-slate-50 border border-slate-100"
                        />
                      ) : (
                        <span className="inline-block w-8 h-8 rounded-full bg-slate-50 border border-slate-100" />
                      )}
                      {p.infortunato && <BadgeInfortunio size={11} />}
                    </span>
                  </td>
                  <td className="py-1.5 font-medium">
                    <Link href={`/giocatore/${encodeURIComponent(p.id)}`} className="hover:underline">
                      {p.nome}
                    </Link>
                  </td>
                  <td className="py-1.5 text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      {isSafeHttpUrl(p.fpedia?.squadraLogoUrl) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.fpedia?.squadraLogoUrl} alt="" className="w-4 h-4 object-contain" />
                      )}
                      {p.squadra}
                    </span>
                  </td>
                  <td className="py-1.5">{celleFantasolidita(p)}</td>
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
                  <td className="py-1.5 text-right">
                    {p.stato === "disponibile" ? (
                      inAsta ? null : (
                        <button
                          onClick={() => apriAsta(p.id)}
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
                        {p.stato === "altrui" && p.prezzoPagato !== undefined && (
                          <span className="text-xs text-slate-500" title="Prezzo pagato dall'avversario">
                            {p.prezzoPagato}
                          </span>
                        )}
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
                <tr className="border-b border-slate-50">
                  <td />
                  <td />
                  <td colSpan={3} className="pb-1.5">
                    <CaratteristicheGiocatore
                      player={p}
                      className="justify-between w-full bg-slate-100 rounded px-2 py-1"
                      caratteristicaAttiva={caratteristicaFiltro}
                      onSelezionaCaratteristica={toggleCaratteristicaFiltro}
                    />
                  </td>
                  <td />
                  <td />
                  {mostraPunteggio && <td />}
                  <td />
                </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
