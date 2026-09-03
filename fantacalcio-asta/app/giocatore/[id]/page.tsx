"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { RefreshCw, Wand2, NotebookText, Armchair } from "lucide-react";
import { FpediaStats, FpediaPillola } from "@/lib/types";
import { computeLivelliRelativiFpedia, getSuggerimentiAsta } from "@/lib/suggestions";
import { matchNews } from "@/lib/matchNews";
import type { NewsFeedError, RawNewsItem } from "@/app/api/news/route";
import { eDellaStagioneCorrente } from "@/lib/stagione";
import { computeLivelliFantasolidita, vociFantasolidita } from "@/lib/fantasolidita";
import { COLORE_LIVELLO, LEGENDA_LIVELLI, classeLivello } from "@/lib/livelloColori";
import { livelloFasciaConsigli } from "@/lib/fasceConsigli";
import {
  computeLivelloUrgenza,
  computePercentualeUrgenza,
  computeUrgenza,
  DETTAGLIO_URGENZA_LABEL,
} from "@/lib/urgenza";
import { useAuctionStore } from "@/lib/store";
import { FavoriteStar } from "@/components/FavoriteStar";
import { CaratteristicheGiocatore } from "@/components/CaratteristicheGiocatore";
import { Pillola } from "@/components/Pillola";
import { BarraFantasolidita } from "@/components/BarraFantasolidita";
import { BadgeInfortunio } from "@/components/BadgeInfortunio";
import { BadgeFuoriclasse } from "@/components/BadgeFuoriclasse";
import { celleRuolo, classeBordoQualita, tooltipUrgenza, vociFantasolditaLista } from "@/components/PlayerTable";
import { isSafeHttpUrl } from "@/lib/url";

// Le "pillole" FPEDIA con un'annata nell'etichetta (es. "Media Fanta Voto
// 2025-2026") riguardano una stagione specifica: qui isoliamo la piu'
// recente (la stagione appena conclusa, quella che l'utente chiama "stagione
// precedente" rispetto alla prossima asta) per raccoglierla in un riquadro a
// parte, e scartiamo le annate piu' vecchie invece di affollare la pagina.
const STAGIONE_REGEX = /(\d{4})-(\d{4})/;

function trovaStagionePiuRecente(pillole: FpediaPillola[]): string | null {
  let migliore: string | null = null;
  let annoMigliore = -1;
  for (const p of pillole) {
    const m = p.label.match(STAGIONE_REGEX);
    if (!m) continue;
    const anno = Number(m[1]);
    if (anno > annoMigliore) {
      annoMigliore = anno;
      migliore = m[0];
    }
  }
  return migliore;
}

export default function GiocatorePage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const players = useAuctionStore((s) => s.players);
  const player = players.find((p) => p.id === id);
  const settings = useAuctionStore((s) => s.settings);
  const applyNewsResults = useAuctionStore((s) => s.applyNewsResults);
  const isMantra = settings.modalita === "mantra";
  const livelloRelativo = useMemo(() => computeLivelliRelativiFpedia(players), [players]);
  const livelloFantasolidita = useMemo(() => computeLivelliFantasolidita(players), [players]);

  // Stessi calcoli usati dal box "Giocatore in asta" in PlayerTable.tsx, per il
  // box gemello qui sotto e per i "Consigli per l'acquisto" nella colonna laterale.
  const urgenza = useMemo(() => computeUrgenza(players, settings), [players, settings]);
  const livelloUrgenza = useMemo(() => computeLivelloUrgenza(players, urgenza), [players, urgenza]);
  const percentualeUrgenza = useMemo(() => computePercentualeUrgenza(players, urgenza), [players, urgenza]);
  const suggerimenti = useMemo(() => getSuggerimentiAsta(players, settings), [players, settings]);
  const astaSuggerimento = useMemo(() => suggerimenti.find((s) => s.player.id === id), [suggerimenti, id]);

  const [aggiornando, setAggiornando] = useState(false);
  const [erroreAggiornamento, setErroreAggiornamento] = useState<string | null>(null);
  const [aggiornandoNotizie, setAggiornandoNotizie] = useState(false);
  const [erroreNotizie, setErroreNotizie] = useState<string | null>(null);
  const [esitoNotizie, setEsitoNotizie] = useState<string | null>(null);

  async function aggiornaFpedia() {
    if (!player) return;
    setAggiornando(true);
    setErroreAggiornamento(null);
    try {
      const res = await fetch("/api/fpedia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: player.nome }),
      });
      const data: { stats: FpediaStats | null; errore?: string } = await res.json();
      if (data.stats) {
        applyNewsResults({ [player.id]: { fpedia: data.stats } });
      } else {
        setErroreAggiornamento(data.errore ?? "Nessun dato trovato su FPEDIA.");
      }
    } catch (err) {
      setErroreAggiornamento(err instanceof Error ? err.message : "Errore di rete.");
    } finally {
      setAggiornando(false);
    }
  }

  async function aggiornaNotizie() {
    if (!player) return;
    setAggiornandoNotizie(true);
    setErroreNotizie(null);
    setEsitoNotizie(null);
    try {
      const res = await fetch("/api/news", { method: "POST" });
      if (!res.ok) throw new Error(`Richiesta fallita (${res.status})`);
      const data: { items: RawNewsItem[]; errori: NewsFeedError[] } = await res.json();
      const updates = matchNews([player], data.items);
      applyNewsResults(updates);
      const trovate = updates[player.id]
        ? `Trovate ${updates[player.id].notizie?.length ?? 0} notizie.`
        : "Nessuna notizia trovata in questo aggiornamento.";
      const feedFalliti =
        data.errori.length > 0
          ? ` Feed non raggiungibili: ${data.errori.map((e) => e.feed).join(", ")}.`
          : "";
      setEsitoNotizie(trovate + feedFalliti);
    } catch (err) {
      setErroreNotizie(err instanceof Error ? err.message : "Errore di rete.");
    } finally {
      setAggiornandoNotizie(false);
    }
  }

  if (!player) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <p className="text-slate-500">Giocatore non trovato.</p>
        <Link href="/" className="text-sm text-slate-900 hover:underline">
          Torna alla dashboard
        </Link>
      </div>
    );
  }

  // matchNews scarta già le notizie di stagioni passate ad ogni aggiornamento, ma
  // questo filtra anche dati salvati prima che quel controllo esistesse.
  const notizieStagioneCorrente = (player.notizie ?? []).filter((n) => eDellaStagioneCorrente(n.data));
  const pillole = player.fpedia?.pillole ?? [];
  const stagionePrecedente = trovaStagionePiuRecente(pillole);
  const pilloleGenerali = pillole.filter((p) => !STAGIONE_REGEX.test(p.label));
  const pilloleStagionePrecedente = stagionePrecedente
    ? pillole.filter((p) => p.label.includes(stagionePrecedente))
    : [];
  const dettaglioUrgenza = urgenza(player);
  const righeUrgenza = dettaglioUrgenza
    ? (Object.keys(DETTAGLIO_URGENZA_LABEL) as (keyof typeof DETTAGLIO_URGENZA_LABEL)[])
        .map((chiave) => ({ label: DETTAGLIO_URGENZA_LABEL[chiave], valore: dettaglioUrgenza[chiave] }))
        .filter((v) => Math.abs(v.valore) >= 0.05)
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <Link href="/" className="text-sm text-slate-500 hover:underline">
        ← Torna alla dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="space-y-4">
          {/* Identica alla parte alta del box "Giocatore in asta" di PlayerTable.tsx (info
              foto/ruolo/squadra/quotazione/FCP/Urgenza, Caratteristiche, Ballottaggio), tranne
              Valore Asta e Simulazione: qui non si sta facendo un'offerta, non avrebbero senso. */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">
                <FavoriteStar id={player.id} preferito={player.preferito} />
              </span>
              <h1 className="text-lg font-bold">{player.nome}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-white border border-amber-100 rounded p-2.5">
              <span
                className="relative inline-block shrink-0"
                title="Bordo colorato in base all'algoritmo FCP: quanto vale questo giocatore (rosso chiaro = scarso, giallo = medio, verde = buono, blu = fuoriclasse)."
              >
                {isSafeHttpUrl(player.fpedia?.immagineUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={player.fpedia?.immagineUrl}
                    alt=""
                    className={`w-14 h-14 rounded-full object-contain bg-slate-50 ${classeBordoQualita(
                      livelloFantasolidita(player, "algFcp")
                    )}`}
                  />
                ) : (
                  <span
                    className={`inline-block w-14 h-14 rounded-full bg-slate-50 ${classeBordoQualita(
                      livelloFantasolidita(player, "algFcp")
                    )}`}
                  />
                )}
                {player.infortunato && <BadgeInfortunio size={16} />}
                {player.fuoriclasse && <BadgeFuoriclasse size={16} />}
              </span>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  {celleRuolo(player.ruolo, player.ruoliMantra, isMantra)}
                  <span className="font-medium">{player.squadra}</span>
                  {isSafeHttpUrl(player.fpedia?.squadraLogoUrl) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.fpedia?.squadraLogoUrl} alt="" className="w-4 h-4 object-contain" />
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  Quot. <strong>{player.quotazione}</strong>
                  {player.fvm !== undefined && (
                    <>
                      {" "}
                      · FVM <strong>{player.fvm}</strong>
                    </>
                  )}
                </div>
              </div>

              {vociFantasolditaLista(player).length > 0 && (
                <div className="flex gap-3">
                  {vociFantasolditaLista(player).map((v) => (
                    <div key={v.campo} className="text-center">
                      <div className="text-[10px] uppercase text-slate-400 tracking-wide flex items-center justify-center gap-1">
                        {v.campo === "algFcp" ? <Wand2 size={11} /> : <NotebookText size={11} />}
                        FCP
                      </div>
                      <div
                        className={`inline-block rounded px-1.5 font-bold ${classeLivello(
                          livelloFantasolidita(player, v.campo)
                        )}`}
                        title={v.label}
                      >
                        {Math.round(v.valore)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {dettaglioUrgenza && (
                <div className="text-center">
                  <div className="text-[10px] uppercase text-slate-400 tracking-wide">Urgenza</div>
                  <div
                    className={`inline-block rounded px-1.5 font-bold ${classeLivello(livelloUrgenza(player))}`}
                    title={tooltipUrgenza(dettaglioUrgenza, percentualeUrgenza(player))}
                  >
                    {percentualeUrgenza(player) ?? "—"}
                  </div>
                </div>
              )}

              {(player.fpedia?.presenze !== undefined || player.fpedia?.fantamedia !== undefined) && (
                <div className="text-center">
                  <div className="text-[10px] uppercase text-slate-400 tracking-wide">Quest&apos;anno</div>
                  <div className="flex items-center gap-2">
                    {player.fpedia?.presenze !== undefined && (
                      <span
                        className="inline-block rounded px-1.5 font-bold bg-slate-100 text-slate-700"
                        title="Partite giocate quest'anno"
                      >
                        {player.fpedia.presenze} PG
                      </span>
                    )}
                    {player.fpedia?.fantamedia !== undefined && (
                      <span
                        className="inline-block rounded px-1.5 font-bold bg-slate-100 text-slate-700"
                        title="FantaMedia di quest'anno"
                      >
                        FM {player.fpedia.fantamedia.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {player.fasciaConsigli && (
              <div className="bg-white border border-amber-100 rounded px-2 py-1.5 text-xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] uppercase text-slate-400 tracking-wide">Consigli</span>
                  <span
                    className={`inline-block rounded px-1.5 font-bold ${classeLivello(
                      livelloFasciaConsigli(player.fasciaConsigli)
                    )}`}
                  >
                    {player.fasciaConsigli}
                  </span>
                </div>
                {player.commentoConsigli && <p className="text-slate-600">{player.commentoConsigli}</p>}
              </div>
            )}

            <CaratteristicheGiocatore
              player={player}
              className="flex-wrap bg-white border border-amber-100 rounded px-2 py-1.5"
              soloPresenti
            />

            {player.ballottaggio && (
              <div className="bg-white border border-amber-100 rounded px-2 py-1.5">
                <div className="text-[10px] uppercase text-slate-400 tracking-wide mb-1 flex items-center gap-1">
                  <Armchair size={11} /> Ballottaggio
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span
                    className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-sm bg-amber-100 text-amber-800 font-bold border-2 border-amber-400"
                    title="Questo giocatore"
                  >
                    {player.nome} {player.ballottaggio.percentuale}%
                  </span>
                  {player.ballottaggio.avversari.map((a) => {
                    const avversario = players.find((pl) => pl.id === a.playerId);
                    const stato = avversario?.stato;
                    return (
                      <Link
                        key={a.playerId}
                        href={`/giocatore/${encodeURIComponent(a.playerId)}`}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 border font-medium hover:underline ${
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
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">Statistiche stagione corrente (FPEDIA)</h2>
              <div className="flex items-center gap-2">
                {player.fpedia && isSafeHttpUrl(player.fpedia.url) && (
                  <a
                    href={player.fpedia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:underline"
                  >
                    Aggiornate il {new Date(player.fpedia.aggiornatoIl).toLocaleString("it-IT")} · fonte
                  </a>
                )}
                <button
                  onClick={aggiornaFpedia}
                  disabled={aggiornando}
                  className="text-xs bg-slate-900 text-white rounded px-2 py-1 disabled:opacity-50"
                >
                  {aggiornando ? "Aggiornamento..." : "Aggiorna da FPEDIA"}
                </button>
              </div>
            </div>
            {/* Non presente nel box sopra (che mostra solo ciò che compare anche durante
                l'asta): il trend dedotto dalle notizie, qui sotto come da richiesta. */}
            {player.trendVoti && (
              <p className="text-xs text-slate-500 mb-3">
                Trend <strong className="text-slate-700">{player.trendVoti}</strong>
              </p>
            )}
            {erroreAggiornamento && <p className="text-red-500 text-xs mb-3">{erroreAggiornamento}</p>}
            {!player.fpedia ? (
              <p className="text-slate-400 text-sm">
                Nessun dato. Clicca &quot;Aggiorna da FPEDIA&quot; qui sopra per recuperarlo.
              </p>
            ) : (
              <>
                {player.fpedia.ruolo && (
                  <span className="inline-block text-xs bg-slate-800 text-white rounded px-2 py-1 mb-3">
                    {player.fpedia.ruolo}
                  </span>
                )}

                {pilloleGenerali.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                    {pilloleGenerali.map((p, i) => (
                      <Pillola key={i} label={p.label} valore={p.valore} livello={livelloRelativo(p.label, p.valore)} />
                    ))}
                  </div>
                )}

                {pilloleStagionePrecedente.length > 0 && (
                  <div className="border border-slate-100 rounded p-3 mb-4">
                    <h3 className="text-xs uppercase text-slate-400 mb-2">
                      {stagionePrecedente?.replace("-", "/")}
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {pilloleStagionePrecedente.map((p, i) => (
                        <Pillola
                          key={i}
                          label={p.label.replace(STAGIONE_REGEX, "").trim()}
                          valore={p.valore}
                          livello={livelloRelativo(p.label, p.valore)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {vociFantasolidita(player).length > 0 && (
                  <div className="border border-slate-100 rounded p-3 mb-4">
                    <h3 className="text-xs uppercase text-slate-400 mb-2">Fantasolidità e rischi</h3>
                    <div className="space-y-2">
                      {vociFantasolidita(player).map((v) => (
                        <BarraFantasolidita
                          key={v.campo}
                          label={v.label}
                          valore={v.valore}
                          livello={livelloFantasolidita(player, v.campo)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div>
                    <div className="text-xs text-slate-400">Ammonizioni</div>
                    <div className="font-semibold">{player.fpedia.ammonizioni ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Espulsioni</div>
                    <div className="font-semibold">{player.fpedia.espulsioni ?? "—"}</div>
                  </div>
                </div>

                {(player.fpedia.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {player.fpedia.tags.map((t, i) => {
                      // Dati salvati prima che i tag diventassero {label, livello} possono ancora essere semplici stringhe.
                      const label = typeof t === "string" ? t : t?.label;
                      const livello = typeof t === "string" ? null : t?.livello ?? null;
                      if (!label) return null;
                      return (
                        <span
                          key={`${label}-${i}`}
                          className={`text-xs rounded px-2 py-1 ${
                            livello ? classeLivello(livello) : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                          }`}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 text-xs text-slate-500 border-t border-slate-100 pt-3 mb-4">
                  {LEGENDA_LIVELLI.map((l) => (
                    <span key={l.livello} className="flex items-center gap-1">
                      <span className={`w-3 h-3 rounded-full ${COLORE_LIVELLO[l.livello].split(" ")[0]}`} />
                      {l.label}
                    </span>
                  ))}
                  <span className="text-slate-400">
                    (calcolato confrontando ogni giocatore con gli altri nel tuo listino)
                  </span>
                </div>

                {player.fpedia.descrizione && <p className="text-sm text-slate-600">{player.fpedia.descrizione}</p>}
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Riquadro "giornale": stesso contenuto della vecchia sezione notizie, con
              impaginazione da testata di quotidiano invece della card standard del resto
              della pagina — è l'unica sezione spostata lateralmente su richiesta. */}
          <div className="relative bg-[#f7f2e6] border border-[#ddd0b0] rounded-lg shadow p-4 font-serif">
            <button
              onClick={aggiornaNotizie}
              disabled={aggiornandoNotizie}
              title="Aggiorna le notizie di questo giocatore"
              className="absolute top-3 right-3 text-slate-500 hover:text-slate-800 disabled:opacity-50"
            >
              <RefreshCw size={14} className={aggiornandoNotizie ? "animate-spin" : ""} />
            </button>
            <div className="text-center border-b-4 border-double border-slate-800 pb-2 mb-3">
              <h2 className="text-lg font-black uppercase tracking-wide">Ultime Notizie</h2>
              {player.notizieAggiornateIl && (
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">
                  Aggiornato il {new Date(player.notizieAggiornateIl).toLocaleDateString("it-IT")}
                </p>
              )}
            </div>
            {(esitoNotizie || erroreNotizie) && (
              <p className={`text-xs font-sans mb-3 ${erroreNotizie ? "text-red-500" : "text-slate-500"}`}>
                {erroreNotizie ?? esitoNotizie}
              </p>
            )}
            {notizieStagioneCorrente.length === 0 && (
              <p className="text-slate-400 text-sm italic text-center">
                Nessuna notizia della stagione corrente. Usa l&apos;icona di aggiornamento qui sopra.
              </p>
            )}
            <ul>
              {notizieStagioneCorrente.map((n, i) => (
                <li key={i} className="border-t border-slate-300 pt-3 mt-3 first:border-t-0 first:pt-0 first:mt-0">
                  {isSafeHttpUrl(n.link) ? (
                    <a
                      href={n.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold leading-snug hover:underline"
                    >
                      {n.titolo}
                    </a>
                  ) : (
                    <span className="font-bold leading-snug">{n.titolo}</span>
                  )}
                  <div className="text-[11px] italic text-slate-500 mt-1">
                    {n.fonte}
                    {n.data && ` · ${new Date(n.data).toLocaleDateString("it-IT")}`}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {astaSuggerimento && (
            <div className="bg-white rounded-lg shadow p-4 text-sm space-y-3">
              <h2 className="font-semibold text-base">Consigli per l&apos;acquisto</h2>
              <div
                className="text-xs leading-snug bg-slate-50 border border-slate-200 rounded px-2 py-1.5"
                title="Max consigliato: soglia oltre la quale il giocatore smette di essere conveniente per il budget residuo. Tetto: oltre questo prezzo non basterebbe almeno 1 a testa per gli slot/posti ancora da riempire."
              >
                Max consigliato <strong>{Math.round(astaSuggerimento.prezzoMassimo.massimoConsigliato)}</strong>
                <span className="text-slate-400"> · tetto {Math.round(astaSuggerimento.prezzoMassimo.tettoSicurezza)}</span>
              </div>
              {righeUrgenza.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase text-slate-400 tracking-wide mb-1">
                    Urgenza {percentualeUrgenza(player) ?? "—"}
                  </div>
                  <ul className="text-xs text-slate-600 space-y-0.5">
                    {righeUrgenza.map((riga) => (
                      <li key={riga.label} className="flex justify-between gap-2">
                        <span>{riga.label}</span>
                        <span className={riga.valore > 0 ? "text-red-600" : "text-slate-400"}>
                          {riga.valore > 0 ? "+" : ""}
                          {riga.valore.toFixed(1)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {astaSuggerimento.moduliUtili && astaSuggerimento.moduliUtili.length > 0 && (
                <p className="text-xs text-slate-500">
                  Aiuta a completare: {astaSuggerimento.moduliUtili.join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
