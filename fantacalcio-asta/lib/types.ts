export type Ruolo = "P" | "D" | "C" | "A";

export const RUOLI: Ruolo[] = ["P", "D", "C", "A"];

export const RUOLO_LABEL: Record<Ruolo, string> = {
  P: "Portiere",
  D: "Difensore",
  C: "Centrocampista",
  A: "Attaccante",
};

/** Stessi colori delle linee Mantra (Por/Difensori/Centrocampisti/Attaccanti), a cui i ruoli Classic corrispondono 1:1. */
// Colore esadecimale (non classe Tailwind: usato anche per gli sfondi a due
// colori dei moduli, che richiedono un gradiente CSS con valori concreti).
export const RUOLO_COLORE: Record<Ruolo, string> = {
  P: "#f59e0b",
  D: "#059669",
  C: "#2563eb",
  A: "#dc2626",
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

/**
 * Livello del semaforo a 5 colori che FPEDIA stessa assegna ad alcuni valori
 * (super=azzurro, buono=verde, sufficiente=giallo, mediocre=arancione,
 * negativo=rosso, incluso "nd"): letto direttamente dalla classe CSS del
 * sito, non calcolato da noi (vedi lib/fpedia.ts).
 */
export type LivelloFpedia = "super" | "buono" | "sufficiente" | "mediocre" | "negativo" | null;

/** Una "pillola" colorata della scheda giocatore FPEDIA (es. "Presenze 2025-2026: 34"). */
export interface FpediaPillola {
  label: string;
  valore: string;
  livello: LivelloFpedia;
}

export interface FpediaTag {
  label: string;
  livello: LivelloFpedia;
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
  /** URL dell'immagine/disegno del giocatore sul sito. */
  immagineUrl?: string;
  /** URL dello stemma/maglia della squadra sul sito. */
  squadraLogoUrl?: string;
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
  /** Tutte le "pillole" colorate della pagina (ALG FCP, presenze, previsionali, ...), nell'ordine del sito. */
  pillole: FpediaPillola[];
  tags: FpediaTag[];
  descrizione?: string;
  stagioniPrecedenti: FpediaStagionePrecedente[];
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
  /**
   * Infortunato secondo le liste "infortunati" di FPEDIA (una per ruolo, aggiornate
   * separatamente da "Aggiorna infortunati" in Settings): non annidato in FpediaStats
   * perché arriva da uno scrape diverso (le liste per ruolo, non la scheda individuale).
   */
  infortunato?: boolean;
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

/**
 * Colore per ruolo Mantra, usato ovunque compaiano le etichette dei ruoli
 * (rosa, tabella, moduli) cosi' che lo stesso ruolo sia sempre riconoscibile
 * allo stesso colore: portiere ambra, resto della difesa verde,
 * centrocampo puro blu, trequartisti/ali viola (distinti dal rosso dei puri
 * attaccanti anche quando compaiono insieme in uno slot dei moduli).
 */
// Colore esadecimale (non classe Tailwind: usato anche per gli sfondi a due
// colori dei moduli, che richiedono un gradiente CSS con valori concreti).
export const RUOLO_MANTRA_COLORE: Record<RuoloMantra, string> = {
  Por: "#f59e0b",
  Dc: "#059669",
  Dd: "#059669",
  Ds: "#059669",
  B: "#059669",
  E: "#2563eb",
  M: "#2563eb",
  C: "#2563eb",
  W: "#9333ea",
  T: "#9333ea",
  A: "#dc2626",
  Pc: "#dc2626",
};

/**
 * Quanto e' "offensivo" ogni ruolo Mantra, da 0 (portiere) a 5.5 (punta
 * pura): usato solo per il bonus di versatilita' del punteggio Priorita'
 * (lib/priorita.ts), per premiare i giocatori multi-ruolo il cui ruolo
 * secondario e' piu' avanzato del primario (es. Dc/E, C/T). I valori
 * intermedi riflettono difensori centrali < laterali < braccetto <
 * centrocampo puro < ala/trequartista < attacco, coerenti con RUOLO_MANTRA_COLORE
 * (che gia' distingue E/M/C da W/T) e con gli 11 moduli di lib/moduliMantra.ts.
 */
export const RUOLO_MANTRA_AVANZAMENTO: Record<RuoloMantra, number> = {
  Por: 0,
  Dc: 1,
  Dd: 1.5,
  Ds: 1.5,
  B: 2,
  E: 3,
  M: 3,
  C: 3.5,
  W: 4.5,
  T: 4.5,
  Pc: 5.5,
  A: 5,
};

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
  /** Quante squadre (te incluso) si spartiscono i giocatori: serve a stimare quando un ruolo sta scarseggiando. */
  numeroPartecipanti: number;
  ruoli: Record<Ruolo, RoleConfig>;
  mantra: MantraConfig;
}

export const DEFAULT_SETTINGS: Settings = {
  modalita: "classic",
  budgetTotale: 500,
  numeroPartecipanti: 8,
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
// esatti contro siti terzi (es. FPEDIA) che invece usano nome+cognome.
const INIZIALE_OMONIMIA_REGEX = /^(.*\S)\s+([A-Za-z])\.$/;

/** Scompone un nome del listino in cognome (+ iniziale del nome, se presente per omonimia). */
export function scomponiNomeListino(nome: string): NomeScomposto {
  const m = nome.trim().match(INIZIALE_OMONIMIA_REGEX);
  if (m) return { cognome: m[1], iniziale: m[2] };
  return { cognome: nome.trim() };
}
