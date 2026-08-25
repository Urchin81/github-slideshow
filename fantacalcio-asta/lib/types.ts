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

export interface FpediaStagionePrecedente {
  stagione: string;
  mediaVoto?: number;
  presenze?: number;
}

/** Statistiche stagione corrente recuperate da fantacalciopedia.com. */
export interface FpediaStats {
  url: string;
  ruolo?: string;
  squadra?: string;
  dataNascita?: string;
  altezzaCm?: number;
  pesoKg?: number;
  nazionalita?: string;
  algFcp?: number;
  punteggioFcp?: number;
  soliditaInvestimento?: number;
  resistenzaInfortuni?: number;
  presenze?: number;
  gol?: number;
  assist?: number;
  mediaVoto?: number;
  ammonizioni?: number;
  espulsioni?: number;
  presenzePreviste?: [number, number];
  golPrevisti?: [number, number];
  assistPrevisti?: [number, number];
  tags: string[];
  descrizione?: string;
  stagioniPrecedenti: FpediaStagionePrecedente[];
  aggiornatoIl: string;
}

/** Statistiche stagione precedente recuperate da footystats.org. */
export interface FstatsStats {
  url: string;
  posizione?: string;
  squadra?: string;
  nazionaleSquadra?: string;
  nazionalita?: string;
  piede?: string;
  eta?: number;
  dataNascita?: string;
  altezzaCm?: number;
  pesoKg?: number;
  /** Stagione a cui si riferiscono le statistiche sotto (es. "2024/2025"). */
  stagione?: string;
  presenze?: number;
  gol?: number;
  assist?: number;
  ammonizioni?: number;
  espulsioni?: number;
  minuti?: number;
  aggiornatoIl: string;
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
  rigorista?: boolean;
  tiratorePunizioni?: boolean;
  tiratoreAngoli?: boolean;
  /** Sintesi qualitativa dedotta dalle notizie (es. "Titolare fisso", "In dubbio"). */
  trendVoti?: string;
  notizie?: NewsItem[];
  notizieAggiornateIl?: string;
  fpedia?: FpediaStats;
  fstats?: FstatsStats;
  /** Preferito personale: sopravvive al reset dell'asta (non è uno stato d'asta). */
  preferito?: boolean;
}

export type LineaMantra = "Portieri" | "Difensori" | "Centrocampisti" | "Attaccanti";

export const LINEE_MANTRA: LineaMantra[] = ["Portieri", "Difensori", "Centrocampisti", "Attaccanti"];

/** Stessa suddivisione in linee usata per colorare i moduli in lib/moduliMantra.ts / app/moduli. */
export const RUOLO_MANTRA_LINEA: Record<RuoloMantra, LineaMantra> = {
  Por: "Portieri",
  Dc: "Difensori",
  Dd: "Difensori",
  Ds: "Difensori",
  B: "Difensori",
  E: "Centrocampisti",
  M: "Centrocampisti",
  C: "Centrocampisti",
  W: "Centrocampisti",
  T: "Centrocampisti",
  A: "Attaccanti",
  Pc: "Attaccanti",
};

/** Linea (Portieri/Difensori/Centrocampisti/Attaccanti) di un giocatore Mantra multi-ruolo: la prima che copre. */
export function lineaMantraGiocatore(ruoliMantra: RuoloMantra[] | undefined): LineaMantra | undefined {
  if (!ruoliMantra || ruoliMantra.length === 0) return undefined;
  return LINEE_MANTRA.find((linea) => ruoliMantra.some((r) => RUOLO_MANTRA_LINEA[r] === linea));
}

export interface RoleConfig {
  slot: number;
  percentualeBudget: number;
}

/** In Mantra non ci sono slot fissi per ruolo: solo un numero minimo/massimo di giocatori totali. */
export interface MantraConfig {
  minGiocatori: number;
  maxGiocatori: number;
}

export interface Settings {
  modalita: Modalita;
  budgetTotale: number;
  ruoli: Record<Ruolo, RoleConfig>;
  mantra: MantraConfig;
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
  mantra: {
    minGiocatori: 25,
    maxGiocatori: 30,
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

export interface NomeScomposto {
  cognome: string;
  /** Iniziale del nome proprio, presente solo quando il listino la aggiunge per distinguere omonimi. */
  iniziale?: string;
}

// Il listino ufficiale Fantacalcio.it riporta solo il cognome, e aggiunge
// l'iniziale del nome (es. "Adekunle A.") solo quando serve a distinguere
// due giocatori con lo stesso cognome. Serve a costruire ricerche/match
// esatti contro siti terzi (FPEDIA, FSTATS) che invece usano nome+cognome.
const INIZIALE_OMONIMIA_REGEX = /^(.*\S)\s+([A-Za-z])\.$/;

/** Scompone un nome del listino in cognome (+ iniziale del nome, se presente per omonimia). */
export function scomponiNomeListino(nome: string): NomeScomposto {
  const m = nome.trim().match(INIZIALE_OMONIMIA_REGEX);
  if (m) return { cognome: m[1], iniziale: m[2] };
  return { cognome: nome.trim() };
}
