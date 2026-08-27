"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Calculator, ShieldAlert, Users, Wallet } from "lucide-react";
import { RUOLI, RUOLI_MANTRA, RUOLO_COLORE, RUOLO_LABEL, RUOLO_MANTRA_COLORE, RUOLO_MANTRA_LABEL } from "@/lib/types";
import {
  computeBudgetResiduoTotale,
  computeClassificaValoreModuli,
  computeCoperturaModuli,
  computeDettaglioModulo,
  computeMantraStato,
  computePianoSpesaMantra,
  computeRoleStats,
  computeValoreMedioAcquisto,
  SOGLIA_RAPPORTO_CONSIGLIATO,
} from "@/lib/suggestions";
import { computeCoperturaRuoliClassic, computeCoperturaRuoliMantra, LivelloCopertura } from "@/lib/coperturaRuoli";
import { coloreSfondoSlot, MODULI_MANTRA, Modulo } from "@/lib/moduliMantra";
import { ModuloVisualizzazione } from "@/components/ModuloVisualizzazione";
import { RoleKey } from "@/components/PlayerTable";
import { useAuctionStore } from "@/lib/store";

const TOOLTIP_COPERTURA: Record<LivelloCopertura, string> = {
  assente: "Nessun titolare per questo ruolo nella tua rosa",
  senza_sostituto: "Nessun sostituto per questo ruolo nella tua rosa: in ballottaggio se il titolare non gioca",
  coperto: "Titolare e almeno un sostituto per questo ruolo",
};

function IconaCopertura({ livello }: { livello: LivelloCopertura }) {
  if (livello === "coperto") return null;
  return (
    <AlertTriangle
      size={12}
      className={livello === "assente" ? "text-red-600" : "text-amber-500"}
    />
  );
}

function PannelloClassic({
  ruoloFiltro,
  onFiltraRuolo,
}: {
  ruoloFiltro: RoleKey | "tutti";
  onFiltraRuolo: (ruolo: RoleKey) => void;
}) {
  const players = useAuctionStore((s) => s.players);
  const settings = useAuctionStore((s) => s.settings);
  const budgetResiduo = computeBudgetResiduoTotale(players, settings);
  const roleStats = computeRoleStats(players, settings);
  const valoreMedioAcquisto = computeValoreMedioAcquisto(players, settings);
  const coperturaRuoli = useMemo(() => computeCoperturaRuoliClassic(players), [players]);

  return (
    <>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-slate-500">Residuo</span>
        <span className="text-2xl font-bold">
          {budgetResiduo} <span className="text-sm font-normal text-slate-400">/ {settings.budgetTotale}</span>
        </span>
      </div>
      <div
        className="flex justify-between items-baseline mb-4 text-sm"
        title="Budget residuo diviso per i giocatori ancora mancanti per completare la rosa (portieri inclusi secondo lo slot Portiere configurato). Se la rosa è già completa, mostra l'intero budget residuo."
      >
        <span className="text-slate-500">Valore medio disponibile</span>
        <span className="font-medium">{Math.round(valoreMedioAcquisto)}</span>
      </div>
      <h3 className="text-xs uppercase text-slate-400 mb-1">Piano di spesa per ruolo residuo</h3>
      <table className="w-full text-xs mb-4 table-fixed">
        <thead>
          <tr className="text-left text-slate-400">
            <th className="pb-1 w-8">Ruolo</th>
            <th className="pb-1 text-right" title="Slot occupati / slot totali per questo ruolo">
              <Users size={13} className="inline-block" />
            </th>
            <th className="pb-1 text-right" title="Budget residuo assegnato a questo ruolo">
              <Wallet size={13} className="inline-block" />
            </th>
            <th className="pb-1 text-right" title="Media disponibile per ogni slot ancora da riempire in questo ruolo">
              <Calculator size={13} className="inline-block" />
            </th>
            <th className="pb-1 text-right" title="Tetto prudente: soglia (+30% della media) oltre la quale conviene evitare di sforare per questo ruolo">
              <ShieldAlert size={13} className="inline-block" />
            </th>
          </tr>
        </thead>
        <tbody>
          {RUOLI.map((ruolo) => {
            const s = roleStats[ruolo];
            return (
              <tr key={ruolo} className="border-t border-slate-100">
                <td className="py-1" title={RUOLO_LABEL[ruolo]}>
                  <span
                    className="text-white rounded px-1"
                    style={{ backgroundColor: RUOLO_COLORE[ruolo] }}
                  >
                    {ruolo}
                  </span>
                </td>
                <td className="py-1 text-right">
                  {s.slotOccupati}/{s.slotTotali}
                </td>
                <td className="py-1 text-right">{Math.round(s.budgetResiduoRuolo)}</td>
                <td className="py-1 text-right font-medium">
                  {s.slotRimanenti > 0 ? Math.round(s.prezzoMedioDisponibile) : "—"}
                </td>
                <td className="py-1 text-right text-slate-500">
                  {s.slotRimanenti > 0 ? Math.round(s.prezzoMedioDisponibile * SOGLIA_RAPPORTO_CONSIGLIATO) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3 className="text-xs uppercase text-slate-400 mb-1">Copertura ruoli</h3>
      <ul className="text-sm flex flex-wrap gap-1.5">
        {RUOLI.map((r) => (
          <li key={r}>
            <button
              onClick={() => onFiltraRuolo(r)}
              title={`${TOOLTIP_COPERTURA[coperturaRuoli[r]]} — clicca per filtrare la tabella su questo ruolo`}
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 border hover:bg-slate-50 ${
                ruoloFiltro === r ? "border-slate-900" : "border-slate-200"
              }`}
            >
              <span className="text-white rounded px-1 text-xs" style={{ backgroundColor: RUOLO_COLORE[r] }}>
                {r}
              </span>
              <IconaCopertura livello={coperturaRuoli[r]} />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function PannelloMantra({
  ruoloFiltro,
  onFiltraRuolo,
}: {
  ruoloFiltro: RoleKey | "tutti";
  onFiltraRuolo: (ruolo: RoleKey) => void;
}) {
  const players = useAuctionStore((s) => s.players);
  const settings = useAuctionStore((s) => s.settings);
  const stato = computeMantraStato(players, settings);
  const coperture = computeCoperturaModuli(players);
  const pianoSpesa = computePianoSpesaMantra(players, settings);
  const valoreMedioAcquisto = computeValoreMedioAcquisto(players, settings);
  const mieiMantra = players.filter((p) => p.stato === "mia");
  const moduliByNome = new Map(MODULI_MANTRA.map((m) => [m.nome, m]));
  const [moduloAperto, setModuloAperto] = useState<Modulo | null>(null);
  const dettagliByNome = useMemo(
    () => new Map(MODULI_MANTRA.map((m) => [m.nome, computeDettaglioModulo(players, m)])),
    [players]
  );
  const coperturaRuoli = useMemo(() => computeCoperturaRuoliMantra(players), [players]);

  // Le 3 formazioni titolari più forti (schierabili con la rosa attuale) per valore
  // complessivo (ALG FCP × quotazione dei titolari): evidenziate con un bordo
  // oro/argento/bronzo in base al piazzamento, per distinguere "più vicino al
  // completamento" (ordine della lista) da "più forte" (questo podio).
  const top3Moduli = useMemo(() => {
    const classifica = computeClassificaValoreModuli(players)
      .filter((m): m is { nome: string; valore: number } => m.valore !== null)
      .sort((a, b) => b.valore - a.valore)
      .slice(0, 3);
    return new Map(classifica.map((m, i) => [m.nome, i + 1]));
  }, [players]);

  return (
    <>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-slate-500">Residuo</span>
        <span className="text-2xl font-bold">
          {stato.budgetResiduo} <span className="text-sm font-normal text-slate-400">/ {settings.budgetTotale}</span>
        </span>
      </div>
      <div
        className="flex justify-between items-baseline mb-1 text-sm"
        title="Budget residuo diviso per i giocatori ancora mancanti per completare la rosa (portieri inclusi secondo lo slot Portiere configurato). Se la rosa è già completa, mostra l'intero budget residuo."
      >
        <span className="text-slate-500">Valore medio disponibile</span>
        <span className="font-medium">{Math.round(valoreMedioAcquisto)}</span>
      </div>
      <div className="flex justify-between items-baseline mb-4 text-sm">
        <span className="text-slate-500">Giocatori presi</span>
        <span className="font-medium">
          {stato.acquistati} <span className="text-slate-400">(min {stato.min} · max {stato.max})</span>
        </span>
      </div>
      {stato.postiRimanenti === 0 && (
        <p className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded p-2 mb-3">
          Hai raggiunto il numero massimo di giocatori acquistabili.
        </p>
      )}

      {pianoSpesa.length > 0 && (
        <>
          <h3 className="text-xs uppercase text-slate-400 mb-1">Piano di spesa per ruolo residuo</h3>
          <ul className="text-sm space-y-1 mb-4">
            {pianoSpesa.map((v) => (
              <li key={v.ruolo} className="flex items-center justify-between">
                <span
                  className="text-white rounded px-1 text-xs"
                  style={{ backgroundColor: RUOLO_MANTRA_COLORE[v.ruolo] }}
                >
                  {v.ruolo}
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <span
                      className="block h-full"
                      style={{
                        width: `${Math.min(100, (v.quotaBudgetSuggerita / stato.budgetResiduo) * 100)}%`,
                        backgroundColor: RUOLO_MANTRA_COLORE[v.ruolo],
                      }}
                    />
                  </span>
                  <span className="text-slate-400 text-xs">{v.quotaBudgetSuggerita}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="text-xs uppercase text-slate-400 mb-1">Moduli (dal più vicino al completamento)</h3>
      <ul className="text-sm space-y-1">
        {coperture.map((m) => {
          const rango = top3Moduli.get(m.nome);
          const bordoRango =
            rango === 1
              ? "border-2 border-yellow-400 pl-1.5"
              : rango === 2
              ? "border-2 border-slate-400 pl-1.5"
              : rango === 3
              ? "border-2 border-amber-700 pl-1.5"
              : "";
          const medaglia = rango === 1 ? "oro" : rango === 2 ? "argento" : rango === 3 ? "bronzo" : null;
          return (
          <li key={m.nome} className={`relative group rounded ${bordoRango}`}>
            <button
              onClick={() => setModuloAperto(moduliByNome.get(m.nome) ?? null)}
              className="w-full flex items-center justify-between hover:bg-slate-50 rounded px-1 -mx-1 py-0.5"
              title={
                medaglia
                  ? `Vedi ${m.nome} in campo — ${rango}ª formazione titolare più forte schierabile con la tua rosa (${medaglia})`
                  : `Vedi ${m.nome} in campo`
              }
            >
              <span>{m.nome}</span>
              <span className="flex items-center gap-2">
                <span className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <span
                    className={`block h-full ${m.coperti === m.totale ? "bg-green-500" : "bg-amber-400"}`}
                    style={{ width: `${(m.coperti / m.totale) * 100}%` }}
                  />
                </span>
                <span className="text-slate-400 text-xs">
                  {m.coperti}/{m.totale}
                </span>
              </span>
            </button>
            <div className="hidden group-hover:block absolute z-20 left-full top-0 ml-2 w-48 bg-white border border-slate-200 rounded shadow-lg p-2 text-xs space-y-0.5">
              <p className="text-slate-400 uppercase text-[10px] mb-1">{m.nome}</p>
              {(dettagliByNome.get(m.nome) ?? []).map((r) => (
                <div
                  key={r.slot.join("/")}
                  className="flex justify-between items-center"
                >
                  <span className="text-white rounded px-1.5 text-[10px]" style={coloreSfondoSlot(r.slot)}>
                    {r.slot.join("/")}
                  </span>
                  <span className={r.coperti < r.totale ? "text-red-600 font-semibold" : "text-slate-600"}>
                    {r.coperti}/{r.totale}
                  </span>
                </div>
              ))}
            </div>
          </li>
          );
        })}
      </ul>

      <h3 className="text-xs uppercase text-slate-400 mb-1 mt-4">Copertura ruoli</h3>
      <ul className="text-sm flex flex-wrap gap-1.5">
        {RUOLI_MANTRA.map((r) => (
          <li key={r}>
            <button
              onClick={() => onFiltraRuolo(r)}
              title={`${RUOLO_MANTRA_LABEL[r]} — ${TOOLTIP_COPERTURA[coperturaRuoli[r]]} — clicca per filtrare la tabella su questo ruolo`}
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 border hover:bg-slate-50 ${
                ruoloFiltro === r ? "border-slate-900" : "border-slate-200"
              }`}
            >
              <span className="text-white rounded px-1 text-xs" style={{ backgroundColor: RUOLO_MANTRA_COLORE[r] }}>
                {r}
              </span>
              <IconaCopertura livello={coperturaRuoli[r]} />
            </button>
          </li>
        ))}
      </ul>

      {moduloAperto && (
        <ModuloVisualizzazione
          modulo={moduloAperto}
          mieiMantra={mieiMantra}
          onClose={() => setModuloAperto(null)}
        />
      )}
    </>
  );
}

export function BudgetPanel({
  ruoloFiltro,
  onFiltraRuolo,
}: {
  ruoloFiltro: RoleKey | "tutti";
  onFiltraRuolo: (ruolo: RoleKey) => void;
}) {
  const settings = useAuctionStore((s) => s.settings);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold text-lg mb-3">Budget</h2>
      {settings.modalita === "classic" ? (
        <PannelloClassic ruoloFiltro={ruoloFiltro} onFiltraRuolo={onFiltraRuolo} />
      ) : (
        <PannelloMantra ruoloFiltro={ruoloFiltro} onFiltraRuolo={onFiltraRuolo} />
      )}
    </div>
  );
}
