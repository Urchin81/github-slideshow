"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  RUOLI,
  RUOLI_MANTRA,
  RUOLO_LABEL,
  RUOLO_MANTRA_LABEL,
  RuoloMantra,
  Ruolo,
  StatoGiocatore,
} from "@/lib/types";
import { getSuggestions, RoleKey } from "@/lib/suggestions";
import { useAuctionStore } from "@/lib/store";

type FiltroStato = "disponibile" | StatoGiocatore | "tutti";

export function PlayerTable() {
  const players = useAuctionStore((s) => s.players);
  const settings = useAuctionStore((s) => s.settings);
  const assignToMe = useAuctionStore((s) => s.assignToMe);
  const assignToOthers = useAuctionStore((s) => s.assignToOthers);
  const resetPlayer = useAuctionStore((s) => s.resetPlayer);
  const isMantra = settings.modalita === "mantra";
  const ruoliAttivi: RoleKey[] = isMantra ? RUOLI_MANTRA : RUOLI;

  const [ruoloFiltro, setRuoloFiltro] = useState<RoleKey | "tutti">("tutti");
  const [statoFiltro, setStatoFiltro] = useState<FiltroStato>("disponibile");
  const [ricerca, setRicerca] = useState("");
  const [soloConsigliati, setSoloConsigliati] = useState(false);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [prezzoInput, setPrezzoInput] = useState("1");
  const [ruoloScelto, setRuoloScelto] = useState<RoleKey | "">("");

  const suggestions = useMemo(() => getSuggestions(players, settings), [players, settings]);
  const suggestionById = useMemo(() => {
    const map = new Map(suggestions.map((s) => [s.player.id, s]));
    return map;
  }, [suggestions]);

  const righe = useMemo(() => {
    let base = statoFiltro === "tutti" ? players : players.filter((p) => p.stato === statoFiltro);

    if (ruoloFiltro !== "tutti") {
      base = base.filter((p) => {
        if (!isMantra) return p.ruolo === ruoloFiltro;
        if (p.stato === "mia") return p.slotRuolo === ruoloFiltro;
        return (p.ruoliMantra ?? []).includes(ruoloFiltro as RuoloMantra);
      });
    }
    if (ricerca.trim()) {
      const q = ricerca.trim().toLowerCase();
      base = base.filter((p) => p.nome.toLowerCase().includes(q) || p.squadra.toLowerCase().includes(q));
    }
    if (soloConsigliati && statoFiltro === "disponibile") {
      base = base.filter((p) => suggestionById.get(p.id)?.consigliato);
    }

    return [...base].sort((a, b) => {
      if (statoFiltro !== "disponibile") return b.quotazione - a.quotazione;
      const sa = suggestionById.get(a.id)?.punteggio ?? 0;
      const sb = suggestionById.get(b.id)?.punteggio ?? 0;
      return sb - sa;
    });
  }, [players, statoFiltro, ruoloFiltro, ricerca, soloConsigliati, suggestionById, isMantra]);

  function apriAssegnazione(id: string, quotazione: number) {
    setAssignId(id);
    setPrezzoInput(String(quotazione || 1));
    const suggestion = suggestionById.get(id);
    setRuoloScelto(suggestion?.ruoloUsato ?? "");
  }

  function handleConferma(id: string) {
    const prezzo = Math.max(1, Number(prezzoInput) || 1);
    assignToMe(id, prezzo, isMantra ? (ruoloScelto || undefined) : undefined);
    setAssignId(null);
    setPrezzoInput("1");
    setRuoloScelto("");
  }

  function ruoloLabel(r: RoleKey) {
    return isMantra ? RUOLO_MANTRA_LABEL[r as RuoloMantra] : RUOLO_LABEL[r as Ruolo];
  }

  function celleRuolo(playerRuolo: Ruolo, ruoliMantra: RuoloMantra[] | undefined, slotRuolo: RoleKey | undefined) {
    if (!isMantra) return playerRuolo;
    if (slotRuolo) return <span className="font-semibold">{slotRuolo}</span>;
    if (!ruoliMantra || ruoliMantra.length === 0) return <span className="text-slate-300">—</span>;
    return (
      <span className="flex gap-1 flex-wrap">
        {ruoliMantra.map((r) => (
          <span key={r} className="bg-slate-100 rounded px-1 text-xs">
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
        <span className="text-sm text-slate-400 ml-auto">{righe.length} giocatori</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
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
              const opzioniRuolo = isMantra ? p.ruoliMantra ?? [] : [];
              return (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-1.5">{celleRuolo(p.ruolo, p.ruoliMantra, p.slotRuolo)}</td>
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
                        <span className="text-green-600 font-semibold">
                          {Math.round(suggestion.punteggio)} ✓
                        </span>
                      ) : (
                        <span className="text-slate-400">{Math.round(suggestion?.punteggio ?? 0)}</span>
                      )}
                    </td>
                  )}
                  <td className="py-1.5 text-right">
                    {p.stato === "disponibile" ? (
                      assignId === p.id ? (
                        <span className="inline-flex items-center gap-1">
                          {isMantra && opzioniRuolo.length > 1 && (
                            <select
                              value={ruoloScelto}
                              onChange={(e) => setRuoloScelto(e.target.value as RoleKey)}
                              className="border border-slate-200 rounded px-1 py-0.5 text-xs"
                            >
                              {opzioniRuolo.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          )}
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
                            className="text-xs bg-slate-900 text-white rounded px-2 py-1"
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
                      <span className="inline-flex items-center gap-2">
                        {p.stato === "mia" && <span className="text-xs text-slate-500">{p.prezzoPagato}</span>}
                        <button onClick={() => resetPlayer(p.id)} className="text-xs text-red-500 hover:underline">
                          annulla
                        </button>
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
