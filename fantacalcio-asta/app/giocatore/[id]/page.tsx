"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { RUOLO_COLORE, RUOLO_LABEL, RUOLO_MANTRA_COLORE, RUOLO_MANTRA_LABEL, RuoloMantra, FpediaStats, FpediaPillola } from "@/lib/types";
import { computeLivelliRelativiFpedia } from "@/lib/suggestions";
import { computeLivelliFantasolidita, vociFantasolidita } from "@/lib/fantasolidita";
import { COLORE_LIVELLO, LEGENDA_LIVELLI, classeLivello } from "@/lib/livelloColori";
import { useAuctionStore } from "@/lib/store";
import { FavoriteStar } from "@/components/FavoriteStar";
import { CaratteristicheGiocatore } from "@/components/CaratteristicheGiocatore";
import { Pillola } from "@/components/Pillola";
import { BarraFantasolidita } from "@/components/BarraFantasolidita";
import { BadgeInfortunio } from "@/components/BadgeInfortunio";
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
  const livelloRelativo = useMemo(() => computeLivelliRelativiFpedia(players), [players]);
  const livelloFantasolidita = useMemo(() => computeLivelliFantasolidita(players), [players]);

  const [aggiornando, setAggiornando] = useState(false);
  const [erroreAggiornamento, setErroreAggiornamento] = useState<string | null>(null);

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

  const pillole = player.fpedia?.pillole ?? [];
  const stagionePrecedente = trovaStagionePiuRecente(pillole);
  const pilloleGenerali = pillole.filter((p) => !STAGIONE_REGEX.test(p.label));
  const pilloleStagionePrecedente = stagionePrecedente
    ? pillole.filter((p) => p.label.includes(stagionePrecedente))
    : [];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/" className="text-sm text-slate-500 hover:underline">
        ← Torna alla dashboard
      </Link>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4">
          <div className="shrink-0 relative">
            {isSafeHttpUrl(player.fpedia?.immagineUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.fpedia?.immagineUrl}
                alt={`Disegno di ${player.nome}`}
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded bg-slate-50 border border-slate-100"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 text-[11px] text-center px-2">
                Nessuna foto
              </div>
            )}
            {player.infortunato && <BadgeInfortunio size={20} />}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-2 mb-1.5">
              <span className="text-xl">
                <FavoriteStar id={player.id} preferito={player.preferito} />
              </span>
              {player.nome}
            </h1>

            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span
                className="text-white text-xs rounded px-1.5 py-0.5"
                style={{ backgroundColor: RUOLO_COLORE[player.ruolo] }}
              >
                {player.ruolo}
              </span>
              <span className="text-sm text-slate-500">{RUOLO_LABEL[player.ruolo]}</span>
              {settings.modalita === "mantra" &&
                (player.ruoliMantra ?? []).map((r: RuoloMantra) => (
                  <span
                    key={r}
                    className="text-xs text-white rounded px-2 py-1"
                    style={{ backgroundColor: RUOLO_MANTRA_COLORE[r] }}
                    title={RUOLO_MANTRA_LABEL[r]}
                  >
                    {r}
                  </span>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3 max-w-sm items-end">
              <div>
                <div className="text-xs text-slate-400">Quotazione</div>
                <div className="font-semibold">{player.quotazione}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">FVM</div>
                <div className="font-semibold">{player.fvm ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Trend</div>
                <div className="font-semibold">{player.trendVoti ?? "Nessun dato"}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isSafeHttpUrl(player.fpedia?.squadraLogoUrl) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={player.fpedia?.squadraLogoUrl}
                  alt={`Maglia ${player.fpedia?.squadra ?? player.squadra}`}
                  className="w-7 h-7 object-contain"
                />
              )}
              <span className="font-medium text-slate-700">{player.squadra}</span>
            </div>
          </div>
        </div>

        <CaratteristicheGiocatore
          player={player}
          className="justify-between w-full bg-slate-100 rounded px-2 py-1 mt-4"
        />
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

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Ultime notizie</h2>
          {player.notizieAggiornateIl && (
            <span className="text-xs text-slate-400">
              Aggiornate il {new Date(player.notizieAggiornateIl).toLocaleString("it-IT")}
            </span>
          )}
        </div>
        {(!player.notizie || player.notizie.length === 0) && (
          <p className="text-slate-400 text-sm">
            Nessuna notizia trovata. Usa il pulsante di aggiornamento notizie nella dashboard.
          </p>
        )}
        <ul className="space-y-3">
          {(player.notizie ?? []).map((n, i) => (
            <li key={i} className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
              {isSafeHttpUrl(n.link) ? (
                <a href={n.link} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                  {n.titolo}
                </a>
              ) : (
                <span className="font-medium">{n.titolo}</span>
              )}
              <div className="text-xs text-slate-400">
                {n.fonte}
                {n.data && ` · ${new Date(n.data).toLocaleDateString("it-IT")}`}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
