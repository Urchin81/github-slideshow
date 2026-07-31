export type Ruolo = "P" | "D" | "C" | "A";

export const RUOLI: Ruolo[] = ["P", "D", "C", "A"];

export const RUOLO_LABEL: Record<Ruolo, string> = {
  P: "Portiere",
  D: "Difensore",
  C: "Centrocampista",
  A: "Attaccante",
};

/** Ruoli del modificatore Mantra. Un giocatore puo' essere idoneo per piu' ruoli. */
export type RuoloMantra = "Por" | "Dc" | "Dd" | "Ds" | "B" | "E" | "M" | "C" | "W" | "T" | "A" | "Pc";

export const RUOLI_MANTRA: RuoloMantra[] = ["Por", "Dc", "Dd", "Ds", "B", "E", "M", "C", "W", "T", "A", "Pc"];

export const RUOLO_MANTRA_LABEL: Record<RuoloMantra, string> = {
  Por: "Portiere",
  Dc: "Difensore centrale",
  Dd: "Difensore destro",
  Ds: "Difensore sinistro",
  B: "Braccetto",
  E: "Esterno",
  M: "Mediano",
  C: "Centrocampista",
  W: "Ala",
  T: "Trequartista",
  A: "Attaccante",
  Pc: "Prima punta",
};

export type Modalita = "classic" | "mantra";

export type StatoGiocatore = "disponibile" | "mia" | "altrui";

export interface NewsItem {
  titolo: string;
  data: string;
  link: string;
  fonte: string;
}

export interface Player {
  id: string;
  ruolo: Ruolo;
  /** Ruoli Mantra idonei (se il listino include la colonna RM). */
  ruoliMantra?: RuoloMantra[];
  nome: string;
  squadra: string;
  quotazione: number;
  fvm?: number;
  stato: StatoGiocatore;
  prezzoPagato?: number;
  /** Ruolo/slot effettivamente occupato in rosa (rilevante in Mantra, dove un giocatore puo' avere piu' ruoli idonei). */
  slotRuolo?: Ruolo | RuoloMantra;
  rigorista?: boolean;
  tiratorePunizioni?: boolean;
  tiratoreAngoli?: boolean;
  /** Sintesi qualitativa dedotta dalle notizie (es. "Titolare fisso", "In dubbio"). */
  trendVoti?: string;
  notizie?: NewsItem[];
  notizieAggiornateIl?: string;
}

export interface RoleConfig {
  slot: number;
  percentualeBudget: number;
}

export interface Settings {
  modalita: Modalita;
  budgetTotale: number;
  ruoli: Record<Ruolo, RoleConfig>;
  ruoliMantra: Record<RuoloMantra, RoleConfig>;
}

export const DEFAULT_SETTINGS: Settings = {
  modalita: "classic",
  budgetTotale: 500,
  ruoli: {
    P: { slot: 3, percentualeBudget: 5 },
    D: { slot: 8, percentualeBudget: 15 },
    C: { slot: 8, percentualeBudget: 30 },
    A: { slot: 6, percentualeBudget: 50 },
  },
  ruoliMantra: {
    Por: { slot: 3, percentualeBudget: 5 },
    Dc: { slot: 2, percentualeBudget: 3.75 },
    Dd: { slot: 2, percentualeBudget: 3.75 },
    Ds: { slot: 2, percentualeBudget: 3.75 },
    B: { slot: 2, percentualeBudget: 3.75 },
    M: { slot: 2, percentualeBudget: 7.5 },
    C: { slot: 2, percentualeBudget: 7.5 },
    E: { slot: 2, percentualeBudget: 7.5 },
    W: { slot: 2, percentualeBudget: 7.5 },
    T: { slot: 2, percentualeBudget: 16.67 },
    A: { slot: 2, percentualeBudget: 16.67 },
    Pc: { slot: 2, percentualeBudget: 16.66 },
  },
};

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

/** Normalizza un testo (minuscolo, senza accenti/diacritici) per confronti robusti. */
export function normalizeText(testo: string): string {
  return testo
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .trim()
    .toLowerCase();
}

/** Chiave stabile per identificare lo stesso giocatore tra import successivi del listino. */
export function playerKey(nome: string, ruolo: Ruolo): string {
  return `${normalizeText(nome)}::${ruolo}`;
}
