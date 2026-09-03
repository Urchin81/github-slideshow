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
  /** Posizione (1°/2°/3°) tra i rigoristi della squadra secondo le probabili formazioni importate (vedi lib/formazioni.ts). */
  ordineRigorista?: 1 | 2 | 3;
  /** Posizione (1°/2°/3°) tra i tiratori di punizione/calci piazzati della squadra secondo le probabili formazioni importate. */
  ordineCalciPiazzati?: 1 | 2 | 3;
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
  /**
   * Giocatore "Fuoriclasse" secondo la guida-squadre di FPEDIA (aggiornato da "Importa
   * ballottaggi/fuoriclasse" in Settings): non annidato in FpediaStats per lo stesso
   * motivo di infortunato, uno scrape separato dalla scheda individuale.
   */
  fuoriclasse?: boolean;
  /**
   * Ballottaggio con altri giocatori del listino per lo stesso posto da titolare,
   * stessa fonte/scrape di fuoriclasse. Solo gli avversari presenti anche nel listino
   * locale sono risolti (un contendente FPEDIA assente dalle quotazioni non serve a
   * un'asta fantacalcio): vedi `lib/ballottaggioResolve.ts`.
   */
  ballottaggio?: BallottaggioInfo;
  /** Preferito personale: sopravvive al reset dell'asta (non è uno stato d'asta). */
  preferito?: boolean;
}

/** Un avversario locale nello stesso ballottaggio di un giocatore, con la percentuale FPEDIA. */
export interface BallottaggioContendente {
  playerId: string;
  nome: string;
  percentuale: number;
}

export interface BallottaggioInfo {
  /** Percentuale FPEDIA di questo giocatore nel ballottaggio. */
  percentuale: number;
  /** Gli altri contendenti locali per lo stesso posto (non include questo giocatore). */
  avversari: BallottaggioContendente[];
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
 * Gruppi di ruoli Mantra per la pianificazione del budget in Settings/Budget:
 * in Mantra non ci sono slot fissi per ruolo, quindi il budget non si divide
 * per singolo ruolo (come in Classic) ma per questi 7 gruppi, che assieme
 * coprono tutti i 12 RUOLI_MANTRA senza sovrapposizioni, più "Riserva" — una
 * quota libera non legata a un ruolo, per rinforzi extra: non ha una "spesa"
 * calcolabile automaticamente (nessun giocatore vi appartiene) e nel pannello
 * Budget resta sempre a 0% speso.
 */
export type GruppoBudgetMantra = "Por" | "Difesa" | "E" | "M" | "C" | "WTA" | "Pc" | "Riserva";

export const GRUPPI_BUDGET_MANTRA: GruppoBudgetMantra[] = ["Por", "Difesa", "E", "M", "C", "WTA", "Pc", "Riserva"];

export const GRUPPO_BUDGET_MANTRA_LABEL: Record<GruppoBudgetMantra, string> = {
  Por: "Por",
  Difesa: "Dc/B/Dd/Ds",
  E: "E",
  M: "M",
  C: "C",
  WTA: "W/T/A",
  Pc: "Pc",
  Riserva: "Riserva",
};

/** Ruoli Mantra coperti da ciascun gruppo di budget (Riserva esclusa: non è legata a ruoli). */
export const GRUPPO_BUDGET_MANTRA_RUOLI: Record<Exclude<GruppoBudgetMantra, "Riserva">, RuoloMantra[]> = {
  Por: ["Por"],
  Difesa: ["Dc", "B", "Dd", "Ds"],
  E: ["E"],
  M: ["M"],
  C: ["C"],
  WTA: ["W", "T", "A"],
  Pc: ["Pc"],
};

/** Gruppo di budget di un giocatore Mantra multi-ruolo: il primo gruppo (nell'ordine di GRUPPI_BUDGET_MANTRA) che uno dei suoi ruoli copre. */
export function gruppoBudgetMantraGiocatore(
  ruoliMantra: RuoloMantra[] | undefined
): Exclude<GruppoBudgetMantra, "Riserva"> | undefined {
  if (!ruoliMantra || ruoliMantra.length === 0) return undefined;
  return GRUPPI_BUDGET_MANTRA.find(
    (gruppo): gruppo is Exclude<GruppoBudgetMantra, "Riserva"> =>
      gruppo !== "Riserva" && GRUPPO_BUDGET_MANTRA_RUOLI[gruppo].some((r) => ruoliMantra.includes(r))
  );
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

/** Colore rappresentativo di ciascun gruppo di budget Mantra: quello del suo primo ruolo (RUOLO_MANTRA_COLORE). "Riserva" non è legata a un ruolo, colore neutro. */
export const GRUPPO_BUDGET_MANTRA_COLORE: Record<GruppoBudgetMantra, string> = {
  Por: RUOLO_MANTRA_COLORE.Por,
  Difesa: RUOLO_MANTRA_COLORE.Dc,
  E: RUOLO_MANTRA_COLORE.E,
  M: RUOLO_MANTRA_COLORE.M,
  C: RUOLO_MANTRA_COLORE.C,
  WTA: RUOLO_MANTRA_COLORE.W,
  Pc: RUOLO_MANTRA_COLORE.Pc,
  Riserva: "#64748b",
};

export interface RoleConfig {
  slot: number;
  percentualeBudget: number;
}

/**
 * Tre distribuzioni di budget tra i gruppi di ruoli Mantra suggerite in
 * Settings (bottoni "Conservativa"/"Bilanciata"/"Aggressiva"): percentuali
 * del budget totale, così che restino valide qualunque sia budgetTotale.
 * Derivate dagli esempi a crediti (base 300) forniti dall'utente,
 * mantenendo la stessa proporzione tra gruppi.
 */
export type StrategiaBudgetMantra = "conservativa" | "bilanciata" | "aggressiva";

export const STRATEGIE_BUDGET_MANTRA: StrategiaBudgetMantra[] = ["conservativa", "bilanciata", "aggressiva"];

export const STRATEGIA_BUDGET_MANTRA_LABEL: Record<StrategiaBudgetMantra, string> = {
  conservativa: "Conservativa",
  bilanciata: "Bilanciata",
  aggressiva: "Aggressiva",
};

export const PERCENTUALE_BUDGET_GRUPPI_STRATEGIA: Record<StrategiaBudgetMantra, Record<GruppoBudgetMantra, number>> = {
  conservativa: { Por: 4, Difesa: 12.67, E: 9.33, M: 4, C: 12.67, WTA: 24, Pc: 30, Riserva: 3.33 },
  bilanciata: { Por: 3.33, Difesa: 10, E: 8.33, M: 3.33, C: 11.67, WTA: 26.67, Pc: 33.33, Riserva: 3.33 },
  aggressiva: { Por: 2.33, Difesa: 8, E: 6.67, M: 2.67, C: 8.67, WTA: 28.33, Pc: 40, Riserva: 3.33 },
};

/** In Mantra non ci sono slot fissi per ruolo: solo un numero minimo/massimo di giocatori totali. */
export interface MantraConfig {
  minGiocatori: number;
  maxGiocatori: number;
  /** Percentuale del budget totale pianificata per ciascun gruppo di ruoli (come RoleConfig.percentualeBudget in Classic): il pannello Budget la converte in crediti in base a budgetTotale per mostrare quanto hai speso rispetto al previsto. */
  percentualeBudgetGruppi: Record<GruppoBudgetMantra, number>;
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
    percentualeBudgetGruppi: { ...PERCENTUALE_BUDGET_GRUPPI_STRATEGIA.bilanciata },
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
