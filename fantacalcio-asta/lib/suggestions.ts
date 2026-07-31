import { Player, RUOLI, Ruolo, Settings } from "./types";

export interface RoleStats {
  ruolo: Ruolo;
  slotTotali: number;
  slotOccupati: number;
  slotRimanenti: number;
  budgetRuolo: number;
  spesoRuolo: number;
  budgetResiduoRuolo: number;
  /** Budget medio disponibile per ciascuno slot ancora da riempire in questo ruolo. */
  prezzoMedioDisponibile: number;
}

export function computeRoleStats(players: Player[], settings: Settings): Record<Ruolo, RoleStats> {
  const stats = {} as Record<Ruolo, RoleStats>;

  for (const ruolo of RUOLI) {
    const config = settings.ruoli[ruolo];
    const mine = players.filter((p) => p.ruolo === ruolo && p.stato === "mia");
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

export interface PlayerSuggestion {
  player: Player;
  prezzoMedioDisponibile: number;
  rapporto: number;
  punteggio: number;
  consigliato: boolean;
}

/**
 * Punteggio di convenienza per un giocatore ancora disponibile: premia una
 * quotazione alta rispetto al budget medio ancora spendibile per uno slot di
 * quel ruolo (rapporto qualita'/prezzo), penalizza chi sfora quel budget
 * medio, e valorizza un FVM superiore alla quotazione se disponibile.
 */
export function getSuggestions(players: Player[], settings: Settings): PlayerSuggestion[] {
  const roleStats = computeRoleStats(players, settings);

  return players
    .filter((p) => p.stato === "disponibile")
    .map((player) => {
      const stats = roleStats[player.ruolo];
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

      return { player, prezzoMedioDisponibile, rapporto, punteggio, consigliato };
    })
    .sort((a, b) => b.punteggio - a.punteggio);
}
