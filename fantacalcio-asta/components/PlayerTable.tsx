"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { AlarmClock, Armchair, ChevronDown, ChevronUp, Euro, Gavel, Newspaper, NotebookText, Wand2 } from "lucide-react";
import {
  LivelloFpedia,
  Player,
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
import { computeMantraStato, getSuggerimentiAsta, simulaAcquisto, valutaRischioSforamento } from "@/lib/suggestions";
import { computeLivelliFantasolidita, vociFantasolidita } from "@/lib/fantasolidita";
import { classeBordoTitolarita } from "@/lib/titolarita";
import {
  computeLivelloUrgenza,
  computePercentualeUrgenza,
  computeUrgenza,
  DETTAGLIO_URGENZA_LABEL,
  DettaglioUrgenza,
} from "@/lib/urgenza";
import { classeLivello } from "@/lib/livelloColori";
import { isSafeHttpUrl } from "@/lib/url";
import { useAuctionStore } from "@/lib/store";
import { FavoriteStar } from "./FavoriteStar";
import { CARATTERISTICHE, CaratteristicheGiocatore } from "./CaratteristicheGiocatore";
import { BadgeInfortunio } from "./BadgeInfortunio";
import { BadgeFuoriclasse } from "./BadgeFuoriclasse";

type CampoOrdinamento =
  | "preferiti"
  | "ruolo"
  | "nome"
  | "squadra"
  | "quotazione"
  | "algFcp"
  | "punteggioFcp"
  | "urgenza";
type DirezioneOrdinamento = "asc" | "desc";
interface StatoOrdinamento {
  campo: CampoOrdinamento;
  direzione: DirezioneOrdinamento;
}

/** Verso "naturale" del primo click su ciascun header: es. quotazione parte decrescente (i più cari prima). */
const DIREZIONE_DEFAULT: Record<CampoOrdinamento, DirezioneOrdinamento> = {
  preferiti: "desc",
  ruolo: "asc",
  nome: "asc",
  squadra: "asc",
  quotazione: "desc",
  algFcp: "desc",
  punteggioFcp: "desc",
  urgenza: "desc",
};

/** Indice del ruolo nell'ordine standard (P/D/C/A o l'elenco Mantra), per ordinare la colonna Ruolo. */
function indiceRuolo(p: { ruolo: Ruolo; ruoliMantra?: RuoloMantra[] }, isMantra: boolean): number {
  if (isMantra) {
    const ruoli = p.ruoliMantra ?? [];
    if (ruoli.length === 0) return RUOLI_MANTRA.length;
    return Math.min(...ruoli.map((r) => RUOLI_MANTRA.indexOf(r)));
  }
  return RUOLI.indexOf(p.ruolo);
}

/**
 * Bordo a 4 livelli di "quanto è forte questo giocatore" (rosso chiaro/giallo/verde/blu),
 * per il box "in asta" — diverso dal bordo titolarità (verde/giallo/rosso/grigio) usato in
 * tabella, che riguarda invece la probabilità di scendere in campo, non il valore.
 * Riusa il semaforo a 5 fasce già calcolato per il badge ALG FCP (livelloFantasolidita),
 * fondendo mediocre/negativo in un'unica fascia "scarso".
 */
export function classeBordoQualita(livello: LivelloFpedia): string {
  switch (livello) {
    case "super":
      return "border-4 border-blue-500";
    case "buono":
      return "border-4 border-green-600";
    case "sufficiente":
      return "border-4 border-yellow-400";
    case "mediocre":
    case "negativo":
      return "border-4 border-red-300";
    default:
      return "border-4 border-slate-300";
  }
}

/**
 * Scomposizione dell'Urgenza come tooltip leggibile, con il ruolo su cui è calcolata
 * (rilevante nei multi-ruolo Mantra). Il numero di testa è il percentile 0-100 mostrato
 * nel badge (non il totale grezzo): la scomposizione sotto resta in unità grezze,
 * utile per capire la direzione e il peso relativo di ogni segnale.
 */
export function tooltipUrgenza(d: DettaglioUrgenza, percentuale: number | null): string {
  const voci = (Object.keys(DETTAGLIO_URGENZA_LABEL) as (keyof typeof DETTAGLIO_URGENZA_LABEL)[])
    .map((chiave) => ({ label: DETTAGLIO_URGENZA_LABEL[chiave], valore: d[chiave] }))
    .filter((v) => Math.abs(v.valore) >= 0.05)
    .map((v) => `${v.label}: ${v.valore > 0 ? "+" : ""}${v.valore.toFixed(1)}`);
  return voci.length > 0
    ? `Urgenza ${percentuale ?? "—"} (${d.ruoloUsato})\n${voci.join("\n")}`
    : "Nessun dato sufficiente per calcolare l'Urgenza";
}

type FiltroStato = "disponibile" | StatoGiocatore | "tutti";
export type RoleKey = Ruolo | RuoloMantra;

/** Badge di ruolo: la letterina Classic colorata, o le pillole di tutti i ruoli Mantra idonei. */
export function celleRuolo(playerRuolo: Ruolo, ruoliMantra: RuoloMantra[] | undefined, isMantra: boolean) {
  if (!isMantra) {
    return (
      <span className="text-white rounded px-1 text-xs" style={{ backgroundColor: RUOLO_COLORE[playerRuolo] }}>
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

// Nella lista giocatori (tabella e box "in asta") si mostrano solo ALG FCP e
// Punteggio FCP: Solidità Fantainvestimento e Resistenza infortuni restano
// visibili nella scheda giocatore, ma qui affollavano la vista senza
// aggiungere abbastanza per lo sguardo veloce durante l'asta.
export function vociFantasolditaLista(p: Parameters<typeof vociFantasolidita>[0]) {
  return vociFantasolidita(p).filter((v) => v.campo === "algFcp" || v.campo === "punteggioFcp");
}

/** Tooltip del badge ballottaggio: il giocatore stesso e tutti gli avversari locali, con percentuale. */
function tooltipBallottaggio(p: Player): string {
  if (!p.ballottaggio) return "";
  const righe = [
    `${p.nome} ${p.ballottaggio.percentuale}%`,
    ...p.ballottaggio.avversari.map((a) => `${a.nome} ${a.percentuale}%`),
  ];
  return `Ballottaggio\n${righe.join("\n")}`;
}

/** Anteprima delle ultime notizie del giocatore, per il tooltip dell'icona giornale in tabella. */
function tooltipNotizie(p: Player): string {
  const notizie = p.notizie ?? [];
  if (notizie.length === 0) return "";
  const righe = notizie.map((n) => {
    const data = n.data ? new Date(n.data).toLocaleDateString("it-IT") : null;
    return `${n.titolo} — ${n.fonte}${data ? ` · ${data}` : ""}`;
  });
  return `Ultime notizie\n${righe.join("\n")}`;
}

/** Quanti avversari locali dello stesso ballottaggio sono ancora disponibili sul mercato. */
function contaSostitutiDisponibili(p: Player, players: Player[]): number {
  if (!p.ballottaggio) return 0;
  return p.ballottaggio.avversari.filter((a) => players.find((pl) => pl.id === a.playerId)?.stato === "disponibile")
    .length;
}

export function PlayerTable({
  filtroBallottaggioId,
  setFiltroBallottaggioId,
  ruoloFiltro,
  setRuoloFiltro,
}: {
  filtroBallottaggioId: string | null;
  setFiltroBallottaggioId: (id: string | null) => void;
  ruoloFiltro: RoleKey | "tutti";
  setRuoloFiltro: (ruolo: RoleKey | "tutti") => void;
}) {
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

  const [statoFiltro, setStatoFiltro] = useState<FiltroStato>("disponibile");
  const [ricerca, setRicerca] = useState("");
  const [soloPreferiti, setSoloPreferiti] = useState(false);
  const [modificaId, setModificaId] = useState<string | null>(null);
  const [modificaInput, setModificaInput] = useState("1");
  const [inAstaId, setInAstaId] = useState<string | null>(null);
  const [prezzoAstaInput, setPrezzoAstaInput] = useState("0");
  const [caratteristicaFiltro, setCaratteristicaFiltro] = useState<string | null>(null);
  const [ordinamento, setOrdinamento] = useState<StatoOrdinamento>({ campo: "algFcp", direzione: "desc" });

  function toggleCaratteristicaFiltro(chiave: string) {
    setCaratteristicaFiltro((attuale) => (attuale === chiave ? null : chiave));
  }

  /** Click su un header: se è già il campo attivo inverte il verso, altrimenti lo seleziona col suo verso di default. */
  function alternaOrdinamento(campo: CampoOrdinamento) {
    setOrdinamento((prev) =>
      prev.campo === campo ? { campo, direzione: prev.direzione === "desc" ? "asc" : "desc" } : { campo, direzione: DIREZIONE_DEFAULT[campo] }
    );
  }

  function indicatoreOrdinamento(campo: CampoOrdinamento) {
    if (ordinamento.campo !== campo) return null;
    return ordinamento.direzione === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />;
  }

  const suggerimenti = useMemo(() => getSuggerimentiAsta(players, settings), [players, settings]);
  const suggerimentoById = useMemo(() => {
    const map = new Map(suggerimenti.map((s) => [s.player.id, s]));
    return map;
  }, [suggerimenti]);
  const livelloFantasolidita = useMemo(() => computeLivelliFantasolidita(players), [players]);
  const urgenza = useMemo(() => computeUrgenza(players, settings), [players, settings]);
  const livelloUrgenza = useMemo(() => computeLivelloUrgenza(players, urgenza), [players, urgenza]);
  const percentualeUrgenza = useMemo(() => computePercentualeUrgenza(players, urgenza), [players, urgenza]);

  // Giocatore attualmente "sotto il martello": resta valido solo finché è ancora
  // disponibile (appena viene assegnato o rimosso si torna automaticamente alla lista intera).
  const inAstaPlayer = useMemo(() => {
    if (!inAstaId) return null;
    const p = players.find((pl) => pl.id === inAstaId);
    return p && p.stato === "disponibile" ? p : null;
  }, [inAstaId, players]);
  const astaSuggerimento = inAstaPlayer ? suggerimentoById.get(inAstaPlayer.id) : undefined;

  // Giocatore il cui ballottaggio e' filtrato (impostato da qui o dall'icona panchina
  // in RosterPanel): ha sempre priorità sul box "in asta", per evitare stati confusi.
  const giocatoreFiltro = useMemo(
    () => (filtroBallottaggioId ? players.find((p) => p.id === filtroBallottaggioId) ?? null : null),
    [filtroBallottaggioId, players]
  );
  useEffect(() => {
    if (filtroBallottaggioId) setInAstaId(null);
  }, [filtroBallottaggioId]);

  function ruoliCompatibili(a: typeof players[number], b: typeof players[number]) {
    return isMantra
      ? (a.ruoliMantra ?? []).some((r) => (b.ruoliMantra ?? []).includes(r))
      : a.ruolo === b.ruolo;
  }

  const righe = useMemo(() => {
    if (giocatoreFiltro?.ballottaggio) {
      const idsDisponibili = new Set(
        giocatoreFiltro.ballottaggio.avversari
          .filter((a) => players.find((pl) => pl.id === a.playerId)?.stato === "disponibile")
          .map((a) => a.playerId)
      );
      return players.filter((p) => idsDisponibili.has(p.id));
    }

    if (inAstaPlayer) {
      const compatibili = players
        .filter((p) => p.id !== inAstaPlayer.id && p.stato === "disponibile" && ruoliCompatibili(p, inAstaPlayer))
        .sort((a, b) => (b.fpedia?.algFcp ?? -Infinity) - (a.fpedia?.algFcp ?? -Infinity));
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
    if (soloPreferiti) {
      base = base.filter((p) => p.preferito);
    }
    if (caratteristicaFiltro) {
      const caratteristica = CARATTERISTICHE.find((c) => c.chiave === caratteristicaFiltro);
      if (caratteristica) base = base.filter((p) => caratteristica.presente(p));
    }

    return [...base].sort((a, b) => {
      let cmp: number;
      switch (ordinamento.campo) {
        case "preferiti":
          cmp = Number(a.preferito ?? false) - Number(b.preferito ?? false);
          break;
        case "ruolo":
          cmp = indiceRuolo(a, isMantra) - indiceRuolo(b, isMantra);
          break;
        case "nome":
          cmp = a.nome.localeCompare(b.nome);
          break;
        case "squadra":
          cmp = a.squadra.localeCompare(b.squadra);
          break;
        case "quotazione":
          cmp = a.quotazione - b.quotazione;
          break;
        case "algFcp":
          cmp = (a.fpedia?.algFcp ?? -Infinity) - (b.fpedia?.algFcp ?? -Infinity);
          break;
        case "punteggioFcp":
          cmp = (a.fpedia?.punteggioFcp ?? -Infinity) - (b.fpedia?.punteggioFcp ?? -Infinity);
          break;
        case "urgenza":
          cmp = (urgenza(a)?.totale ?? -Infinity) - (urgenza(b)?.totale ?? -Infinity);
          break;
        default:
          cmp = (a.fpedia?.algFcp ?? -Infinity) - (b.fpedia?.algFcp ?? -Infinity);
          break;
      }
      return ordinamento.direzione === "desc" ? -cmp : cmp;
    });
  }, [
    players,
    statoFiltro,
    ruoloFiltro,
    ricerca,
    soloPreferiti,
    caratteristicaFiltro,
    isMantra,
    inAstaPlayer,
    ordinamento,
    urgenza,
    giocatoreFiltro,
  ]);

  const mostraValutazioni = statoFiltro === "disponibile" || !!inAstaPlayer || !!giocatoreFiltro?.ballottaggio;

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

  function rimuoviGiocatoreFiltro() {
    if (!giocatoreFiltro) return;
    const messaggio =
      giocatoreFiltro.prezzoPagato !== undefined
        ? `Rimuovere ${giocatoreFiltro.nome} dalla tua rosa? Il prezzo pagato (${giocatoreFiltro.prezzoPagato}) andrà perso.`
        : `Rimettere ${giocatoreFiltro.nome} tra i disponibili?`;
    if (confirm(messaggio)) {
      resetPlayer(giocatoreFiltro.id);
      setFiltroBallottaggioId(null);
    }
  }

  function ruoloLabel(r: RoleKey) {
    return isMantra ? RUOLO_MANTRA_LABEL[r as RuoloMantra] : RUOLO_LABEL[r as Ruolo];
  }

  function celleFCPedia(p: (typeof players)[number]) {
    const voci = vociFantasolditaLista(p);
    if (voci.length === 0) return <span className="text-slate-300">—</span>;
    return (
      <div className="flex justify-center gap-2">
        {voci.map((v) => (
          <span
            key={v.campo}
            className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${classeLivello(
              livelloFantasolidita(p, v.campo)
            )}`}
            title={v.label}
          >
            {Math.round(v.valore)}
          </span>
        ))}
      </div>
    );
  }

  const prezzoAstaNum = Number(prezzoAstaInput) || 0;
  const rischioAsta = astaSuggerimento
    ? valutaRischioSforamento(prezzoAstaNum, astaSuggerimento.prezzoMassimo)
    : null;

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
            <span
              className="relative inline-block shrink-0"
              title="Bordo colorato in base all'algoritmo FCP: quanto vale questo giocatore (rosso chiaro = scarso, giallo = medio, verde = buono, blu = fuoriclasse)."
            >
              {isSafeHttpUrl(inAstaPlayer.fpedia?.immagineUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={inAstaPlayer.fpedia?.immagineUrl}
                  alt=""
                  className={`w-14 h-14 rounded-full object-contain bg-slate-50 ${classeBordoQualita(
                    livelloFantasolidita(inAstaPlayer, "algFcp")
                  )}`}
                />
              ) : (
                <span
                  className={`inline-block w-14 h-14 rounded-full bg-slate-50 ${classeBordoQualita(
                    livelloFantasolidita(inAstaPlayer, "algFcp")
                  )}`}
                />
              )}
              {inAstaPlayer.infortunato && <BadgeInfortunio size={16} />}
              {inAstaPlayer.fuoriclasse && <BadgeFuoriclasse size={16} />}
            </span>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                {celleRuolo(inAstaPlayer.ruolo, inAstaPlayer.ruoliMantra, isMantra)}
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
              </div>
            </div>

            {vociFantasolditaLista(inAstaPlayer).length > 0 && (
              <div className="flex gap-3">
                {vociFantasolditaLista(inAstaPlayer).map((v) => (
                  <div key={v.campo} className="text-center">
                    <div className="text-[10px] uppercase text-slate-400 tracking-wide flex items-center justify-center gap-1">
                      {v.campo === "algFcp" ? <Wand2 size={11} /> : <NotebookText size={11} />}
                      FCP
                    </div>
                    <div
                      className={`inline-block rounded px-1.5 font-bold ${classeLivello(
                        livelloFantasolidita(inAstaPlayer, v.campo)
                      )}`}
                      title={v.label}
                    >
                      {Math.round(v.valore)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {urgenza(inAstaPlayer) && (
              <div className="text-center">
                <div className="text-[10px] uppercase text-slate-400 tracking-wide">Urgenza</div>
                <div
                  className={`inline-block rounded px-1.5 font-bold ${classeLivello(livelloUrgenza(inAstaPlayer))}`}
                  title={tooltipUrgenza(urgenza(inAstaPlayer)!, percentualeUrgenza(inAstaPlayer))}
                >
                  {percentualeUrgenza(inAstaPlayer) ?? "—"}
                </div>
              </div>
            )}
          </div>

          <CaratteristicheGiocatore
            player={inAstaPlayer}
            className="flex-wrap bg-white border border-amber-100 rounded px-2 py-1.5"
            soloPresenti
          />

          {inAstaPlayer.ballottaggio && (
            <div className="bg-white border border-amber-100 rounded px-2 py-1.5">
              <div className="text-[10px] uppercase text-slate-400 tracking-wide mb-1 flex items-center gap-1">
                <Armchair size={11} /> Ballottaggio
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span
                  className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-sm bg-amber-100 text-amber-800 font-bold border-2 border-amber-400"
                  title="Il giocatore in asta"
                >
                  {inAstaPlayer.nome} {inAstaPlayer.ballottaggio.percentuale}%
                </span>
                {inAstaPlayer.ballottaggio.avversari.map((a) => {
                  const avversario = players.find((pl) => pl.id === a.playerId);
                  const stato = avversario?.stato;
                  return (
                    <span
                      key={a.playerId}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 border font-medium ${
                        stato === "mia"
                          ? "bg-green-100 text-green-800 border-green-300"
                          : stato === "altrui"
                          ? "bg-slate-200 text-slate-500 border-slate-300 line-through"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                      title={
                        stato === "mia"
                          ? "Già nella tua rosa"
                          : stato === "altrui"
                          ? "Già preso da altri"
                          : "Ancora disponibile"
                      }
                    >
                      {a.nome} {a.percentuale}%
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-start gap-3">
            <div className="bg-white border-2 border-amber-300 rounded-lg p-3 shadow-sm space-y-2 w-56 shrink-0">
              <div className="text-xs uppercase text-amber-700 font-semibold tracking-wide">Valore Asta</div>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => incrementaPrezzoAsta(-1)}
                  className="w-10 h-10 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold text-xl leading-none shrink-0"
                  aria-label="Diminuisci prezzo"
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  value={prezzoAstaInput}
                  onChange={(e) => setPrezzoAstaInput(e.target.value)}
                  className="w-20 text-center border-2 border-slate-300 rounded-lg px-1 py-2 text-lg font-bold"
                />
                <button
                  onClick={() => incrementaPrezzoAsta(1)}
                  className="w-10 h-10 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold text-xl leading-none shrink-0"
                  aria-label="Aumenta prezzo"
                >
                  +
                </button>
              </div>

              {astaSuggerimento && (
                <div
                  className="text-[11px] leading-snug bg-slate-50 border border-slate-200 rounded px-2 py-1"
                  title="Max consigliato: soglia oltre la quale il giocatore smette di essere conveniente per il budget residuo. Tetto: oltre questo prezzo non basterebbe almeno 1 a testa per gli slot/posti ancora da riempire."
                >
                  Max consigliato <strong>{Math.round(astaSuggerimento.prezzoMassimo.massimoConsigliato)}</strong>
                  <span className="text-slate-400"> · tetto {Math.round(astaSuggerimento.prezzoMassimo.tettoSicurezza)}</span>
                </div>
              )}

              <div className="flex gap-2">
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
                  className="flex-1 text-sm font-semibold bg-green-600 text-white rounded-lg px-2 py-2 hover:bg-green-700 disabled:opacity-40 disabled:bg-slate-300"
                >
                  Preso da me
                </button>
                <button
                  onClick={handleConfermaAltri}
                  className="flex-1 text-xs font-medium bg-slate-200 rounded-lg px-2 py-2 hover:bg-slate-300"
                  title="Il prezzo è facoltativo: se lo indichi resta visibile in tabella, utile per seguire l'andamento delle puntate."
                >
                  Preso da altri
                </button>
              </div>
            </div>

            {simulazione && (
              <div className="bg-white border border-amber-100 rounded p-2 text-xs space-y-1 flex-1 min-w-[180px]">
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
                    {astaSuggerimento?.moduliUtili && astaSuggerimento.moduliUtili.length > 0 && (
                      <p className="text-slate-500">Aiuta a completare: {astaSuggerimento.moduliUtili.join(", ")}</p>
                    )}
                  </>
                )}
              </div>
            )}
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
        </div>
      ) : giocatoreFiltro?.ballottaggio ? (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm space-y-3">
          <div className="flex items-center gap-2">
            <Armchair size={16} className="text-amber-700 shrink-0" />
            <span className="font-semibold">Ballottaggio:</span>
            <Link href={`/giocatore/${encodeURIComponent(giocatoreFiltro.id)}`} className="font-semibold hover:underline">
              {giocatoreFiltro.nome}
            </Link>
            <button
              onClick={() => setFiltroBallottaggioId(null)}
              className="ml-auto text-xs bg-slate-200 rounded px-2 py-1 hover:bg-slate-300"
            >
              Torna alla lista completa
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-white border border-amber-100 rounded p-2.5">
            <span
              className="relative inline-block shrink-0"
              title="Bordo colorato in base all'algoritmo FCP: quanto vale questo giocatore (rosso chiaro = scarso, giallo = medio, verde = buono, blu = fuoriclasse)."
            >
              {isSafeHttpUrl(giocatoreFiltro.fpedia?.immagineUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={giocatoreFiltro.fpedia?.immagineUrl}
                  alt=""
                  className={`w-14 h-14 rounded-full object-contain bg-slate-50 ${classeBordoQualita(
                    livelloFantasolidita(giocatoreFiltro, "algFcp")
                  )}`}
                />
              ) : (
                <span
                  className={`inline-block w-14 h-14 rounded-full bg-slate-50 ${classeBordoQualita(
                    livelloFantasolidita(giocatoreFiltro, "algFcp")
                  )}`}
                />
              )}
              {giocatoreFiltro.infortunato && <BadgeInfortunio size={16} />}
              {giocatoreFiltro.fuoriclasse && <BadgeFuoriclasse size={16} />}
            </span>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                {celleRuolo(giocatoreFiltro.ruolo, giocatoreFiltro.ruoliMantra, isMantra)}
                <span className="font-medium">{giocatoreFiltro.squadra}</span>
                {isSafeHttpUrl(giocatoreFiltro.fpedia?.squadraLogoUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={giocatoreFiltro.fpedia?.squadraLogoUrl} alt="" className="w-4 h-4 object-contain" />
                )}
              </div>
              <div className="text-xs text-slate-500">
                Quot. <strong>{giocatoreFiltro.quotazione}</strong>
                {giocatoreFiltro.fvm !== undefined && (
                  <>
                    {" "}
                    · FVM <strong>{giocatoreFiltro.fvm}</strong>
                  </>
                )}
              </div>
            </div>

            {vociFantasolditaLista(giocatoreFiltro).length > 0 && (
              <div className="flex gap-3">
                {vociFantasolditaLista(giocatoreFiltro).map((v) => (
                  <div key={v.campo} className="text-center">
                    <div className="text-[10px] uppercase text-slate-400 tracking-wide flex items-center justify-center gap-1">
                      {v.campo === "algFcp" ? <Wand2 size={11} /> : <NotebookText size={11} />}
                      FCP
                    </div>
                    <div
                      className={`inline-block rounded px-1.5 font-bold ${classeLivello(
                        livelloFantasolidita(giocatoreFiltro, v.campo)
                      )}`}
                      title={v.label}
                    >
                      {Math.round(v.valore)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {urgenza(giocatoreFiltro) && (
              <div className="text-center">
                <div className="text-[10px] uppercase text-slate-400 tracking-wide">Urgenza</div>
                <div
                  className={`inline-block rounded px-1.5 font-bold ${classeLivello(livelloUrgenza(giocatoreFiltro))}`}
                  title={tooltipUrgenza(urgenza(giocatoreFiltro)!, percentualeUrgenza(giocatoreFiltro))}
                >
                  {percentualeUrgenza(giocatoreFiltro) ?? "—"}
                </div>
              </div>
            )}
          </div>

          <CaratteristicheGiocatore
            player={giocatoreFiltro}
            className="flex-wrap bg-white border border-amber-100 rounded px-2 py-1.5"
            soloPresenti
          />

          <div className="bg-white border border-amber-100 rounded px-2 py-1.5">
            <div className="text-[10px] uppercase text-slate-400 tracking-wide mb-1 flex items-center gap-1">
              <Armchair size={11} /> Ballottaggio
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span
                className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-sm bg-amber-100 text-amber-800 font-bold border-2 border-amber-400"
                title="Il giocatore nella tua rosa"
              >
                {giocatoreFiltro.nome} {giocatoreFiltro.ballottaggio.percentuale}%
              </span>
              {giocatoreFiltro.ballottaggio.avversari.map((a) => {
                const avversario = players.find((pl) => pl.id === a.playerId);
                const stato = avversario?.stato;
                return (
                  <span
                    key={a.playerId}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 border font-medium ${
                      stato === "mia"
                        ? "bg-green-100 text-green-800 border-green-300"
                        : stato === "altrui"
                        ? "bg-slate-200 text-slate-500 border-slate-300 line-through"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                    title={
                      stato === "mia"
                        ? "Già nella tua rosa"
                        : stato === "altrui"
                        ? "Già preso da altri"
                        : "Ancora disponibile"
                    }
                  >
                    {a.nome} {a.percentuale}%
                  </span>
                );
              })}
            </div>
          </div>

          <div className="bg-white border-2 border-amber-300 rounded-lg p-3 shadow-sm">
            <button
              onClick={rimuoviGiocatoreFiltro}
              className="w-full text-sm font-semibold bg-red-600 text-white rounded-lg px-3 py-2 hover:bg-red-700"
            >
              Rimuovi dalla rosa
            </button>
          </div>

          <p className="text-sm text-slate-400">{righe.length} giocatori disponibili nel ballottaggio</p>
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
              <th
                className="pb-2 cursor-pointer select-none hover:text-slate-600"
                onClick={() => alternaOrdinamento("preferiti")}
                title="Ordina per preferiti"
              >
                <span className="inline-flex items-center gap-0.5">★{indicatoreOrdinamento("preferiti")}</span>
              </th>
              <th
                className="pb-2 cursor-pointer select-none hover:text-slate-600"
                onClick={() => alternaOrdinamento("ruolo")}
                title="Ordina per ruolo"
              >
                <span className="inline-flex items-center gap-0.5">Ruolo{indicatoreOrdinamento("ruolo")}</span>
              </th>
              <th className="pb-2">Foto</th>
              <th
                className="pb-2 cursor-pointer select-none hover:text-slate-600"
                onClick={() => alternaOrdinamento("nome")}
                title="Ordina per nome"
              >
                <span className="inline-flex items-center gap-0.5">Nome{indicatoreOrdinamento("nome")}</span>
              </th>
              <th
                className="pb-2 cursor-pointer select-none hover:text-slate-600"
                onClick={() => alternaOrdinamento("squadra")}
                title="Ordina per squadra"
              >
                <span className="inline-flex items-center gap-0.5">Squadra{indicatoreOrdinamento("squadra")}</span>
              </th>
              <th
                className="pb-2 text-center cursor-pointer select-none hover:text-slate-600"
                onClick={() => alternaOrdinamento("quotazione")}
                title="Ordina per quotazione"
              >
                <span className="inline-flex items-center justify-center gap-0.5">
                  <Euro size={12} />
                  {indicatoreOrdinamento("quotazione")}
                </span>
              </th>
              <th className="pb-2 text-center">
                <span className="inline-flex items-center justify-center gap-3">
                  <span
                    className="inline-flex items-center gap-0.5 cursor-pointer select-none hover:text-slate-600"
                    onClick={() => alternaOrdinamento("algFcp")}
                    title="Ordina per Algoritmo Fantacalciopedia"
                  >
                    <Wand2 size={12} />
                    {indicatoreOrdinamento("algFcp")}
                  </span>
                  <span
                    className="inline-flex items-center gap-0.5 cursor-pointer select-none hover:text-slate-600"
                    onClick={() => alternaOrdinamento("punteggioFcp")}
                    title="Ordina per Punteggio FantaCalcioPedia"
                  >
                    <NotebookText size={12} />
                    {indicatoreOrdinamento("punteggioFcp")}
                  </span>
                </span>
              </th>
              {mostraValutazioni && (
                <th
                  className="pb-2 text-center cursor-pointer select-none hover:text-slate-600"
                  onClick={() => alternaOrdinamento("urgenza")}
                  title="Ordina per Urgenza"
                >
                  <span className="inline-flex items-center justify-center gap-0.5">
                    <AlarmClock size={12} />
                    {indicatoreOrdinamento("urgenza")}
                  </span>
                </th>
              )}
              <th className="pb-2 text-right" title="Azioni">
                <Gavel size={12} className="inline-block" />
              </th>
            </tr>
          </thead>
          <tbody>
            {righe.map((p, i) => {
              const inAsta = inAstaPlayer?.id === p.id;
              const zebra = i % 2 === 1 ? "bg-slate-50/70" : "bg-white";
              return (
                <Fragment key={p.id}>
                <tr className={inAsta ? "bg-amber-50/60" : `${zebra} hover:bg-slate-100`}>
                  <td className="py-1.5">
                    <FavoriteStar id={p.id} preferito={p.preferito} />
                  </td>
                  <td className="py-1.5">{celleRuolo(p.ruolo, p.ruoliMantra, isMantra)}</td>
                  <td className="py-1.5">
                    <span className="relative inline-block">
                      {isSafeHttpUrl(p.fpedia?.immagineUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.fpedia?.immagineUrl}
                          alt=""
                          className={`w-8 h-8 rounded-full object-contain bg-slate-50 ${classeBordoTitolarita(p)}`}
                        />
                      ) : (
                        <span className={`inline-block w-8 h-8 rounded-full bg-slate-50 ${classeBordoTitolarita(p)}`} />
                      )}
                      {p.infortunato && <BadgeInfortunio size={11} />}
                      {p.fuoriclasse && <BadgeFuoriclasse size={11} />}
                    </span>
                  </td>
                  <td className="py-1.5 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Link href={`/giocatore/${encodeURIComponent(p.id)}`} className="hover:underline">
                        {p.nome}
                      </Link>
                      {p.notizie && p.notizie.length > 0 && (
                        <span title={tooltipNotizie(p)} className="shrink-0">
                          <Newspaper size={12} className="text-slate-400" />
                        </span>
                      )}
                    </span>
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
                  <td className="py-1.5 text-center">
                    <span className="inline-block rounded px-1.5 py-0.5 text-xs font-semibold bg-slate-100 border border-slate-400 text-slate-700">
                      {p.quotazione}
                    </span>
                  </td>
                  <td className="py-1.5 text-center">{celleFCPedia(p)}</td>
                  {mostraValutazioni && (
                    <td className="py-1.5 text-center">
                      {urgenza(p) ? (
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${classeLivello(
                            livelloUrgenza(p)
                          )}`}
                          title={tooltipUrgenza(urgenza(p)!, percentualeUrgenza(p))}
                        >
                          {percentualeUrgenza(p) ?? "—"}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  )}
                  <td className="py-1.5 text-right">
                    {p.stato === "disponibile" ? (
                      inAsta ? null : (
                        <div className="flex flex-col items-end gap-0.5">
                          <button
                            onClick={() => apriAsta(p.id)}
                            title="Giocatore in asta: mostra i giocatori con ruoli compatibili ancora disponibili"
                            className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-slate-100 text-slate-600"
                          >
                            <Gavel size={16} />
                          </button>
                          {p.ballottaggio && (
                            <button
                              onClick={() => setFiltroBallottaggioId(p.id)}
                              title={tooltipBallottaggio(p)}
                              className="flex flex-col items-center leading-none hover:bg-slate-100 rounded px-1 py-0.5 -mt-0.5"
                            >
                              <span className="text-[9px] font-bold text-amber-600">
                                {contaSostitutiDisponibili(p, players)}/{p.ballottaggio.avversari.length}
                              </span>
                              <Armchair size={13} className="text-slate-400" />
                            </button>
                          )}
                        </div>
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
                <tr className={`border-b border-slate-50 ${inAsta ? "bg-amber-50/60" : zebra}`}>
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
                  {mostraValutazioni && <td />}
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
