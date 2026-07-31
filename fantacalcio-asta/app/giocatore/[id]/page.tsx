"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { RUOLO_LABEL, RUOLO_MANTRA_LABEL, RuoloMantra } from "@/lib/types";
import { useAuctionStore } from "@/lib/store";

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
  const player = useAuctionStore((s) => s.players.find((p) => p.id === id));
  const settings = useAuctionStore((s) => s.settings);

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
          <h1 className="text-2xl font-bold">{player.nome}</h1>
          <span className="text-sm text-slate-400">{player.squadra}</span>
        </div>
        <p className="text-slate-500 mb-4">
          {statoLabel}
          {player.stato === "mia" && player.prezzoPagato !== undefined && ` · pagato ${player.prezzoPagato}`}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <div className="text-xs text-slate-400">Ruolo Classic</div>
            <div className="font-semibold">
              {player.ruolo} · {RUOLO_LABEL[player.ruolo]}
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
                  className={`text-xs rounded px-2 py-1 ${
                    player.slotRuolo === r ? "bg-slate-900 text-white" : "bg-slate-100"
                  }`}
                  title={RUOLO_MANTRA_LABEL[r]}
                >
                  {r}
                </span>
              ))}
            </div>
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
