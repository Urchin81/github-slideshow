"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FpediaPillola, LivelloFpedia, RUOLO_COLORE, RUOLO_LABEL, RUOLO_MANTRA_COLORE, RUOLO_MANTRA_LABEL, RuoloMantra } from "@/lib/types";
import { getSuggestions } from "@/lib/suggestions";
import { useAuctionStore } from "@/lib/store";
import { FavoriteStar } from "@/components/FavoriteStar";

function Flag({ attivo, label }: { attivo?: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
        attivo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"
      }`}
    >
      {attivo ? "✓" : "—"} {label}
    </span>
  );
}

// Stesso semaforo a 5 colori usato da FPEDIA (vedi lib/fpedia.ts): un livello non
// riconosciuto (es. valore non ancora colorato dal sito) resta grigio neutro,
// non lo forziamo in una categoria per non fabbricare un giudizio che non abbiamo.
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

function Pillola({ p }: { p: FpediaPillola }) {
  return (
    <div className="flex flex-col items-center text-center gap-1.5">
      <span className={`inline-flex items-center justify-center min-w-[3.5rem] px-2.5 py-2 rounded-full text-sm font-bold ${classeLivello(p.livello)}`}>
        {p.valore}
      </span>
      <span className="text-[10px] uppercase text-slate-400 tracking-wide leading-tight">{p.label}</span>
    </div>
  );
}

export default function GiocatorePage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const players = useAuctionStore((s) => s.players);
  const player = players.find((p) => p.id === id);
  const settings = useAuctionStore((s) => s.settings);
  const moduliUtili =
    settings.modalita === "mantra" && player?.stato === "disponibile"
      ? getSuggestions(players, settings).find((s) => s.player.id === id)?.moduliUtili ?? []
      : [];

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
          <div className="mb-4">
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

        {settings.modalita === "mantra" && player.stato === "disponibile" && (
          <div className="mb-4">
            <div className="text-xs text-slate-400 mb-1">Utile per completare i moduli</div>
            {moduliUtili.length === 0 ? (
              <p className="text-slate-400 text-sm">
                Non risulta decisivo per i moduli più vicini al completamento in questo momento.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {moduliUtili.map((m) => (
                  <span key={m} className="text-xs rounded px-2 py-1 bg-green-50 text-green-700 border border-green-100">
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-2">
          <Flag attivo={player.rigorista} label="Rigorista" />
          <Flag attivo={player.tiratorePunizioni} label="Tiratore punizioni" />
          <Flag attivo={player.tiratoreAngoli} label="Tiratore angoli" />
        </div>
        <p className="text-xs text-slate-400">
          Flag dedotti automaticamente dalle notizie recuperate: possono contenere imprecisioni.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Statistiche stagione corrente (FPEDIA)</h2>
          {player.fpedia && (
            <a href={player.fpedia.url} target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:underline">
              Aggiornate il {new Date(player.fpedia.aggiornatoIl).toLocaleString("it-IT")} · fonte
            </a>
          )}
        </div>
        {!player.fpedia ? (
          <p className="text-slate-400 text-sm">
            Nessun dato. Usa il pulsante &quot;Aggiorna statistiche FPEDIA&quot; nella dashboard.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-4">
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
                  className="w-12 h-12 object-contain"
                />
              )}
              {player.fpedia.ruolo && (
                <span className="text-xs bg-slate-800 text-white rounded px-2 py-1">{player.fpedia.ruolo}</span>
              )}
            </div>

            {(player.fpedia.pillole ?? []).length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
                {player.fpedia.pillole.map((p, i) => (
                  <Pillola key={i} p={p} />
                ))}
              </div>
            )}

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
