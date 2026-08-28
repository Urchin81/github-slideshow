"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import {
  GRUPPO_BUDGET_MANTRA_COLORE,
  GRUPPO_BUDGET_MANTRA_RUOLI,
  RUOLI,
  RUOLO_COLORE,
  RUOLO_LABEL,
  RUOLO_MANTRA_COLORE,
  RUOLO_MANTRA_LABEL,
  RuoloMantra,
} from "@/lib/types";
import {
  ColoreBarraGruppoMantra,
  computeBudgetResiduoTotale,
  computeClassificaValoreModuli,
  computeCoperturaModuli,
  computeDettaglioModulo,
  computeImpattoBudgetGruppiMantra,
  computeMantraStato,
  computeRoleStats,
  computeValoreMedioAcquisto,
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
  if (livello === "coperto") return <Check size={12} className="text-green-600" />;
  return (
    <AlertTriangle
      size={12}
      className={livello === "assente" ? "text-red-600" : "text-amber-500"}
    />
  );
}

/** Ruoli Mantra di un gruppo, in linea sotto la sua barra di budget: stesso badge/icona/filtro già usato per la copertura ruoli. */
function RigaRuoliGruppo({
  ruoli,
  coperturaRuoli,
  ruoloFiltro,
  onFiltraRuolo,
}: {
  ruoli: RuoloMantra[];
  coperturaRuoli: Record<RuoloMantra, LivelloCopertura>;
  ruoloFiltro: RoleKey | "tutti";
  onFiltraRuolo: (ruolo: RoleKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {ruoli.map((r) => (
        <button
          key={r}
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
      ))}
    </div>
  );
}

/** Rosso più tenue (Tailwind red-400) per il riempimento delle barre in sforamento: segnala il superamento senza il rosso acceso, riservato al testo di avviso. */
const ROSSO_SFORAMENTO_BARRA = "#f87171";

/** Verde fino al 70% del budget previsto, giallo fino al 100%, rosso oltre. */
function coloreBarraAvanzamento(speso: number, budgetPrevisto: number): string {
  if (budgetPrevisto <= 0) return "#94a3b8";
  const rapporto = speso / budgetPrevisto;
  if (rapporto > 1) return ROSSO_SFORAMENTO_BARRA;
  if (rapporto > 0.7) return "#f59e0b";
  return "#16a34a";
}

const HEX_COLORE_BARRA_GRUPPO: Record<ColoreBarraGruppoMantra, string> = {
  verde: "#16a34a",
  ambra: "#f59e0b",
  blu: "#2563eb",
  rosso: ROSSO_SFORAMENTO_BARRA,
};

/**
 * Barra di avanzamento spesa/budget previsto per un ruolo o un gruppo di
 * ruoli: resta ferma al 100% in caso di sforamento, con l'importo dello
 * sforamento a fianco. In Mantra il colore dello sforamento (blu finché la
 * Riserva condivisa lo copre, rosso una volta esaurita) arriva da fuori
 * tramite `coloreOverride`; senza, usa le soglie standard (Classic, che non
 * ha una Riserva). `penalitaDisponibile`, quando non in sforamento, sostituisce
 * il budget massimo mostrato (secondo numero di "speso / massimo") con quello
 * già ridotto dall'erosione, in rosso, invece di aggiungere una riga a parte.
 */
function BarraBudgetRuolo({
  label,
  colore,
  speso,
  budgetPrevisto,
  coloreOverride,
  penalitaDisponibile,
}: {
  label: string;
  colore: string;
  speso: number;
  budgetPrevisto: number;
  coloreOverride?: string;
  penalitaDisponibile?: number;
}) {
  const sforato = speso > budgetPrevisto;
  const larghezza = budgetPrevisto > 0 ? Math.min(100, (speso / budgetPrevisto) * 100) : 0;
  const coloreBarra = coloreOverride ?? coloreBarraAvanzamento(speso, budgetPrevisto);
  const disponibileEroso = !sforato && (penalitaDisponibile ?? 0) > 0;
  const budgetMassimoMostrato = budgetPrevisto - (penalitaDisponibile ?? 0);
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-0.5">
        <span className="text-white rounded px-1 text-xs" style={{ backgroundColor: colore }}>
          {label}
        </span>
        <span className={sforato ? "text-red-600 font-semibold text-xs" : "text-slate-500 text-xs"}>
          {speso} /{" "}
          {disponibileEroso ? (
            <span
              className="text-red-600 font-bold"
              title="La Riserva è esaurita e un altro gruppo ha sforato oltre quanto poteva coprire: il tuo budget massimo si riduce di conseguenza."
            >
              {budgetMassimoMostrato}
            </span>
          ) : (
            budgetPrevisto
          )}
          {sforato && ` (sforato di ${speso - budgetPrevisto})`}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${larghezza}%`, backgroundColor: coloreBarra }} />
      </div>
    </div>
  );
}

/** Barra della Riserva Mantra: parte piena (100%, verde) e scende man mano che copre lo sforamento altrui, fino a esaurirsi (rossa, vuota). */
function BarraRiserva({ budgetPrevisto, consumata, residua }: { budgetPrevisto: number; consumata: number; residua: number }) {
  const percentualeResidua = budgetPrevisto > 0 ? Math.max(0, Math.min(100, (residua / budgetPrevisto) * 100)) : 0;
  const rapportoConsumata = budgetPrevisto > 0 ? consumata / budgetPrevisto : 0;
  const colore = rapportoConsumata >= 1 ? ROSSO_SFORAMENTO_BARRA : rapportoConsumata > 0.7 ? "#f59e0b" : "#16a34a";
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-0.5">
        <span className="text-white rounded px-1 text-xs" style={{ backgroundColor: GRUPPO_BUDGET_MANTRA_COLORE.Riserva }}>
          Riserva
        </span>
        <span className="text-slate-500 text-xs" title="Cuscinetto condiviso: copre lo sforamento degli altri gruppi finché non si esaurisce.">
          {consumata > 0 ? `${residua} residui / ${budgetPrevisto}` : `${budgetPrevisto} disponibili`}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${percentualeResidua}%`, backgroundColor: colore }} />
      </div>
    </div>
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
      <h3 className="text-xs uppercase text-slate-400 mb-1">Budget per ruolo</h3>
      <div className="space-y-2 mb-4">
        {RUOLI.map((ruolo) => {
          const s = roleStats[ruolo];
          return (
            <BarraBudgetRuolo
              key={ruolo}
              label={ruolo}
              colore={RUOLO_COLORE[ruolo]}
              speso={Math.round(s.spesoRuolo)}
              budgetPrevisto={Math.round(s.budgetRuolo)}
            />
          );
        })}
      </div>

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
  const impattoBudget = computeImpattoBudgetGruppiMantra(players, settings);
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

      <h3 className="text-xs uppercase text-slate-400 mb-1">Budget per gruppo di ruoli</h3>
      <div className="space-y-3 mb-4">
        {impattoBudget.gruppi.map((g) => (
          <div key={g.gruppo}>
            <BarraBudgetRuolo
              label={g.label}
              colore={GRUPPO_BUDGET_MANTRA_COLORE[g.gruppo]}
              speso={g.speso}
              budgetPrevisto={g.budgetPrevisto}
              coloreOverride={HEX_COLORE_BARRA_GRUPPO[g.colore]}
              penalitaDisponibile={g.penalitaDisponibile}
            />
            <RigaRuoliGruppo
              ruoli={GRUPPO_BUDGET_MANTRA_RUOLI[g.gruppo]}
              coperturaRuoli={coperturaRuoli}
              ruoloFiltro={ruoloFiltro}
              onFiltraRuolo={onFiltraRuolo}
            />
          </div>
        ))}
        <BarraRiserva
          budgetPrevisto={impattoBudget.riserva.budgetPrevisto}
          consumata={impattoBudget.riserva.consumata}
          residua={impattoBudget.riserva.residua}
        />
      </div>

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
