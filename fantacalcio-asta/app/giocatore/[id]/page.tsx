"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { FpediaStats, LivelloFpedia, RUOLO_COLORE, RUOLO_LABEL, RUOLO_MANTRA_COLORE, RUOLO_MANTRA_LABEL, RuoloMantra } from "@/lib/types";
import { computeLivelliRelativiFpedia } from "@/lib/suggestions";
import { useAuctionStore } from "@/lib/store";
import { FavoriteStar } from "@/components/FavoriteStar";

// Semaforo a 5 colori (stesse fasce mostrate in legenda sotto le pillole): un
// livello non calcolabile (troppo pochi altri giocatori da confrontare)
// resta grigio neutro, non lo forziamo in una categoria a caso.
const COLORE_LIVELLO: Record<Exclude<LivelloFpedia, null>, string> = {
  super: "bg-sky-500 text-white",
  buono: "bg-green-600 text-white",
  sufficiente: "bg-yellow-400 text-slate-900",
  mediocre: "bg-orange-500 text-white",
  negativo: "bg-red-800 text-white",
};
const LEGENDA_LIVELLI: { livello: Exclude<LivelloFpedia, null>; label: string }[] = [
  { livello: "super", label: "Super" },
  { livello: "buono", label: "Buono" },
  { livello: "sufficiente", label: "Sufficiente" },
  { livello: "mediocre", label: "Mediocre" },
  { livello: "negativo", label: "Negativo" },
];

function classeLivello(livello: LivelloFpedia): string {
  return livello ? COLORE_LIVELLO[livello] : "bg-slate-200 text-slate-600";
}

function Pillola({ label, valore, livello }: { label: string; valore: string; livello: LivelloFpedia }) {
  return (
    <div className="flex flex-col items-center text-center gap-1.5">
      <span
        className={`inline-flex items-center justify-center min-w-[3.5rem] px-2.5 py-2 rounded-full text-sm font-bold ${classeLivello(livello)}`}
      >
        {valore}
      </span>
      <span className="text-[10px] uppercase text-slate-400 tracking-wide leading-tight">{label}</span>
    </div>
  );
}

export default function GiocatorePage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const players = useAuctionStore((s) => s.players);
  const player = players.find((p) => p.id === id);
  const settings = useAuctionStore((s) => s.settings);
  const applyNewsResults = useAuctionStore((s) => s.applyNewsResults);
  const livelloRelativo = useMemo(() => computeLivelliRelativiFpedia(players), [players]);

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

  const statoLabel =
    player.stato === "mia" ? "Nella tua rosa" : player.stato === "altrui" ? "Preso da altri" : "Disponibile";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/" className="text-sm text-slate-500 hover:underline">
        ← Torna alla dashboard
      </Link>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-xl">
              <FavoriteStar id={player.id} preferito={player.preferito} />
            </span>
            {player.nome}
          </h1>
          <span className="text-sm text-slate-400">{player.squadra}</span>
        </div>
        <p className="text-slate-500 mb-4">
          {statoLabel}
          {player.stato === "mia" && player.prezzoPagato !== undefined && ` · pagato ${player.prezzoPagato}`}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <div className="text-xs text-slate-400">Ruolo Classic</div>
            <div className="font-semibold flex items-center gap-1.5">
              <span
                className="text-white text-xs rounded px-1.5 py-0.5"
                style={{ backgroundColor: RUOLO_COLORE[player.ruolo] }}
              >
                {player.ruolo}
              </span>
              {RUOLO_LABEL[player.ruolo]}
            </div>
          </div>
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

        {settings.modalita === "mantra" && (
          <div>
            <div className="text-xs text-slate-400 mb-1">Ruoli Mantra idonei</div>
            <div className="flex flex-wrap gap-1">
              {(player.ruoliMantra ?? []).length === 0 && (
                <span className="text-slate-400 text-sm">Non specificato nel listino</span>
              )}
              {(player.ruoliMantra ?? []).map((r: RuoloMantra) => (
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
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Statistiche stagione corrente (FPEDIA)</h2>
          <div className="flex items-center gap-2">
            {player.fpedia && (
              <a
                href={player.fpedia.url}
                target="_blank"
                rel="noreferrer"
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
            <div className="flex gap-4 mb-4">
              <div className="flex flex-col items-center gap-2 shrink-0 w-20">
                {player.fpedia.immagineUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={player.fpedia.immagineUrl}
                    alt={`Disegno di ${player.nome}`}
                    className="w-20 h-20 object-contain rounded bg-slate-50 border border-slate-100"
                  />
                )}
                {player.fpedia.squadraLogoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={player.fpedia.squadraLogoUrl}
                    alt={`Maglia ${player.fpedia.squadra ?? player.squadra}`}
                    className="w-10 h-10 object-contain"
                  />
                )}
                {player.fpedia.ruolo && (
                  <span className="text-xs bg-slate-800 text-white rounded px-2 py-1">{player.fpedia.ruolo}</span>
                )}
              </div>

              {(player.fpedia.pillole ?? []).length > 0 && (
                <div className="grid grid-cols-3 gap-3 flex-1">
                  {player.fpedia.pillole.map((p, i) => (
                    <Pillola key={i} label={p.label} valore={p.valore} livello={livelloRelativo(p.label, p.valore)} />
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4 text-sm">
              <div>
                <div className="text-xs text-slate-400">Punteggio FCP</div>
                <div className="font-semibold">{player.fpedia.punteggioFcp ?? "—"}/100</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Solidità investimento</div>
                <div className="font-semibold">{player.fpedia.soliditaInvestimento ?? "—"}/5</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Resistenza infortuni</div>
                <div className="font-semibold">{player.fpedia.resistenzaInfortuni ?? "—"}/5</div>
              </div>
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

            {player.fpedia.stagioniPrecedenti.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-slate-400 mb-1">Media fantavoto stagioni precedenti</div>
                <div className="flex gap-4 text-sm">
                  {player.fpedia.stagioniPrecedenti.map((s) => (
                    <span key={s.stagione}>
                      {s.stagione}: <span className="font-semibold">{s.mediaVoto ?? "nd"}</span>
                      {s.presenze !== undefined && <span className="text-slate-400"> ({s.presenze} pres.)</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
              <a href={n.link} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                {n.titolo}
              </a>
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
