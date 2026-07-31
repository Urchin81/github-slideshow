import { Player, RUOLI, RUOLI_MANTRA, Ruolo, RuoloMantra, Settings } from "./types";

export type RoleKey = Ruolo | RuoloMantra;

export interface RoleStats {
  ruolo: RoleKey;
  slotTotali: number;
  slotOccupati: number;
  slotRimanenti: number;
  budgetRuolo: number;
  spesoRuolo: number;
  budgetResiduoRuolo: number;
  /** Budget medio disponibile per ciascuno slot ancora da riempire in questo ruolo. */
  prezzoMedioDisponibile: number;
}

function activeRoles(settings: Settings): RoleKey[] {
  return settings.modalita === "classic" ? RUOLI : RUOLI_MANTRA;
}

function roleConfig(settings: Settings, ruolo: RoleKey) {
  return settings.modalita === "classic"
    ? settings.ruoli[ruolo as Ruolo]
    : settings.ruoliMantra[ruolo as RuoloMantra];
}

function isOwnedInRole(player: Player, ruolo: RoleKey, settings: Settings): boolean {
  if (player.stato !== "mia") return false;
  return settings.modalita === "classic" ? player.ruolo === ruolo : player.slotRuolo === ruolo;
}

export function computeRoleStats(players: Player[], settings: Settings): Record<string, RoleStats> {
  const stats: Record<string, RoleStats> = {};

  for (const ruolo of activeRoles(settings)) {
    const config = roleConfig(settings, ruolo);
    const mine = players.filter((p) => isOwnedInRole(p, ruolo, settings));
    const slotOccupati = mine.length;
    const slotRimanenti = Math.max(0, config.slot - slotOccupati);
    const spesoRuolo = mine.reduce((sum, p) => sum + (p.prezzoPagato ?? 0), 0);
    const budgetRuolo = (settings.budgetTotale * config.percentualeBudget) / 100;
    const budgetResiduoRuolo = Math.max(0, budgetRuolo - spesoRuolo);
    const prezzoMedioDisponibile = slotRimanenti > 0 ? budgetResiduoRuolo / slotRimanenti : 0;

    stats[ruolo] = {
      ruolo,
      slotTotali: config.slot,
      slotOccupati,
      slotRimanenti,
      budgetRuolo,
      spesoRuolo,
      budgetResiduoRuolo,
      prezzoMedioDisponibile,
    };
  }

  return stats;
}

export function computeBudgetResiduoTotale(players: Player[], settings: Settings): number {
  const speso = players
    .filter((p) => p.stato === "mia")
    .reduce((sum, p) => sum + (p.prezzoPagato ?? 0), 0);
  return settings.budgetTotale - speso;
}

interface RoleScore {
  prezzoMedioDisponibile: number;
  rapporto: number;
  punteggio: number;
  consigliato: boolean;
}

/**
 * Punteggio di convenienza per un giocatore rispetto a un determinato ruolo:
 * premia una quotazione alta rispetto al budget medio ancora spendibile per
 * uno slot di quel ruolo (rapporto qualita'/prezzo), penalizza chi sfora quel
 * budget medio, e valorizza un FVM superiore alla quotazione se disponibile.
 */
function scoreForRole(player: Player, stats: RoleStats): RoleScore {
  const prezzoMedioDisponibile = stats.prezzoMedioDisponibile;
  const rapporto =
    prezzoMedioDisponibile > 0
      ? player.quotazione / prezzoMedioDisponibile
      : player.quotazione > 0
        ? Infinity
        : 0;

  const eccedenza = Math.max(0, player.quotazione - prezzoMedioDisponibile);
  const bonusFvm = player.fvm ? (player.fvm - player.quotazione) * 0.5 : 0;
  const punteggio = player.quotazione - eccedenza * 2 + bonusFvm;
  const consigliato = stats.slotRimanenti > 0 && rapporto <= 1.3;

  return { prezzoMedioDisponibile, rapporto, punteggio, consigliato };
}

export interface RuoloOpzione extends RoleScore {
  ruolo: RoleKey;
}

export interface PlayerSuggestion extends RoleScore {
  player: Player;
  /** Ruolo/slot usato per il punteggio (il migliore tra quelli idonei in Mantra). */
  ruoloUsato?: RoleKey;
  /** In Mantra: punteggio per ciascun ruolo idoneo, per lasciare scegliere lo slot in fase di acquisto. */
  opzioniRuolo?: RuoloOpzione[];
}

export function getSuggestions(players: Player[], settings: Settings): PlayerSuggestion[] {
  const roleStats = computeRoleStats(players, settings);
  const disponibili = players.filter((p) => p.stato === "disponibile");

  const suggestions: PlayerSuggestion[] = disponibili.map((player) => {
    if (settings.modalita === "classic") {
      const score = scoreForRole(player, roleStats[player.ruolo]);
      return { player, ruoloUsato: player.ruolo, ...score };
    }

    const eligibili = player.ruoliMantra ?? [];
    if (eligibili.length === 0) {
      return { player, prezzoMedioDisponibile: 0, rapporto: 0, punteggio: 0, consigliato: false };
    }

    const opzioniRuolo: RuoloOpzione[] = eligibili.map((ruolo) => ({
      ruolo,
      ...scoreForRole(player, roleStats[ruolo]),
    }));
    const migliore = opzioniRuolo.reduce((best, cur) => (cur.punteggio > best.punteggio ? cur : best));

    return { player, ruoloUsato: migliore.ruolo, opzioniRuolo, ...migliore };
  });

  return suggestions.sort((a, b) => b.punteggio - a.punteggio);
}
