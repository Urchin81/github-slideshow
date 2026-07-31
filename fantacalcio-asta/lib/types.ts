export type Ruolo = "P" | "D" | "C" | "A";

export const RUOLI: Ruolo[] = ["P", "D", "C", "A"];

export const RUOLO_LABEL: Record<Ruolo, string> = {
  P: "Portiere",
  D: "Difensore",
  C: "Centrocampista",
  A: "Attaccante",
};

export type StatoGiocatore = "disponibile" | "mia" | "altrui";

export interface Player {
  id: string;
  ruolo: Ruolo;
  nome: string;
  squadra: string;
  quotazione: number;
  fvm?: number;
  stato: StatoGiocatore;
  prezzoPagato?: number;
}

export interface RoleConfig {
  slot: number;
  percentualeBudget: number;
}

export interface Settings {
  budgetTotale: number;
  ruoli: Record<Ruolo, RoleConfig>;
}

export const DEFAULT_SETTINGS: Settings = {
  budgetTotale: 500,
  ruoli: {
    P: { slot: 3, percentualeBudget: 5 },
    D: { slot: 8, percentualeBudget: 15 },
    C: { slot: 8, percentualeBudget: 30 },
    A: { slot: 6, percentualeBudget: 50 },
  },
};
