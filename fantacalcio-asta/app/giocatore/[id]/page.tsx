"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { RUOLO_COLORE, RUOLO_LABEL, RUOLO_MANTRA_COLORE, RUOLO_MANTRA_LABEL, RuoloMantra } from "@/lib/types";
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
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
              <div>
                <div className="text-xs text-slate-400">Presenze</div>
                <div className="font-semibold">{player.fpedia.presenze ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Gol</div>
                <div className="font-semibold">{player.fpedia.gol ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Assist</div>
                <div className="font-semibold">{player.fpedia.assist ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Media voto</div>
                <div className="font-semibold">{player.fpedia.mediaVoto ?? "—"}</div>
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <div className="text-xs text-slate-400">ALG FCP</div>
                <div className="font-semibold">{player.fpedia.algFcp ?? "—"}/100</div>
              </div>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <div className="text-xs text-slate-400">Presenze previste</div>
                <div className="font-semibold">
                  {player.fpedia.presenzePreviste ? player.fpedia.presenzePreviste.join("–") : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Gol previsti</div>
                <div className="font-semibold">
                  {player.fpedia.golPrevisti ? player.fpedia.golPrevisti.join("–") : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Assist previsti</div>
                <div className="font-semibold">
                  {player.fpedia.assistPrevisti ? player.fpedia.assistPrevisti.join("–") : "—"}
                </div>
              </div>
            </div>

            {player.fpedia.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {player.fpedia.tags.map((t) => (
                  <span key={t} className="text-xs rounded px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {t}
                  </span>
                ))}
              </div>
            )}

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
