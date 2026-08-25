import { LivelloFpedia, Player, RUOLI, RUOLI_MANTRA, Ruolo, RuoloMantra, Settings } from "./types";
import { MODULI_MANTRA, SlotModulo } from "./moduliMantra";
import { costruisciMatchmaker, MatchmakerModulo } from "./bipartiteMatching";

// ---------------------------------------------------------------------------
// Comune (Classic + Mantra)
// ---------------------------------------------------------------------------

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
  /** Solo Classic: il ruolo su cui e' stato calcolato il punteggio. */
  ruoloUsato?: Ruolo;
  /** Solo Mantra: nomi dei moduli (tra i piu' vicini al completamento) che questo giocatore aiuterebbe a completare. */
  moduliUtili?: string[];
}

export function getSuggestions(players: Player[], settings: Settings): PlayerSuggestion[] {
  return settings.modalita === "classic"
    ? getSuggestionsClassic(players, settings)
    : getSuggestionsMantra(players, settings);
}

// ---------------------------------------------------------------------------
// Classic: slot fissi e budget percentuale per ruolo
// ---------------------------------------------------------------------------

export interface RoleStats {
  ruolo: Ruolo;
  slotTotali: number;
  slotOccupati: number;
  slotRimanenti: number;
  budgetRuolo: number;
  spesoRuolo: number;
  budgetResiduoRuolo: number;
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

/**
 * Punteggio di convenienza: premia una quotazione alta rispetto al budget
 * medio ancora spendibile per uno slot di quel ruolo (rapporto
 * qualita'/prezzo), penalizza chi sfora quel budget medio, e valorizza un FVM
 * superiore alla quotazione se disponibile.
 */
function scoreValoreForBudget(quotazione: number, fvm: number | undefined, prezzoMedioDisponibile: number) {
  const rapporto =
    prezzoMedioDisponibile > 0 ? quotazione / prezzoMedioDisponibile : quotazione > 0 ? Infinity : 0;
  const eccedenza = Math.max(0, quotazione - prezzoMedioDisponibile);
  const bonusFvm = fvm ? (fvm - quotazione) * 0.5 : 0;
  const punteggio = quotazione - eccedenza * 2 + bonusFvm;
  return { rapporto, punteggio };
}

function getSuggestionsClassic(players: Player[], settings: Settings): PlayerSuggestion[] {
  const roleStats = computeRoleStats(players, settings);

  return players
    .filter((p) => p.stato === "disponibile")
    .map((player) => {
      const stats = roleStats[player.ruolo];
      const { rapporto, punteggio } = scoreValoreForBudget(
        player.quotazione,
        player.fvm,
        stats.prezzoMedioDisponibile
      );
      const consigliato = stats.slotRimanenti > 0 && rapporto <= 1.3;
      return {
        player,
        prezzoMedioDisponibile: stats.prezzoMedioDisponibile,
        rapporto,
        punteggio,
        consigliato,
        ruoloUsato: player.ruolo,
      };
    })
    .sort((a, b) => b.punteggio - a.punteggio);
}

// ---------------------------------------------------------------------------
// Mantra: nessun vincolo di slot per ruolo, solo un numero min/max di
// giocatori totali. I ruoli piu' necessari si deducono dai moduli tattici
// (lib/moduliMantra.ts): quali sono piu' vicini al completamento e quali
// slot mancano per completarli.
// ---------------------------------------------------------------------------

export interface MantraStato {
  acquistati: number;
  min: number;
  max: number;
  postiRimanenti: number;
  budgetResiduo: number;
  prezzoMedioDisponibile: number;
}

export function computeMantraStato(players: Player[], settings: Settings): MantraStato {
  const acquistati = players.filter((p) => p.stato === "mia").length;
  const { minGiocatori: min, maxGiocatori: max } = settings.mantra;
  const postiRimanenti = Math.max(0, max - acquistati);
  const budgetResiduo = computeBudgetResiduoTotale(players, settings);
  const prezzoMedioDisponibile = postiRimanenti > 0 ? budgetResiduo / postiRimanenti : 0;
  return { acquistati, min, max, postiRimanenti, budgetResiduo, prezzoMedioDisponibile };
}

export interface ModuloCoverage {
  nome: string;
  coperti: number;
  totale: number;
  slotScoperti: SlotModulo[];
}

interface CoperturaModuliInterna {
  coperture: ModuloCoverage[];
  matchers: Map<string, MatchmakerModulo>;
}

function calcolaCoperturaModuli(players: Player[]): CoperturaModuliInterna {
  const posseduti = players
    .filter((p) => p.stato === "mia" && p.ruoliMantra && p.ruoliMantra.length > 0)
    .map((p) => ({ id: p.id, ruoli: p.ruoliMantra as RuoloMantra[] }));

  const matchers = new Map<string, MatchmakerModulo>();
  const coperture: ModuloCoverage[] = MODULI_MANTRA.map((modulo) => {
    const matcher = costruisciMatchmaker(modulo.slot, posseduti);
    matchers.set(modulo.nome, matcher);
    return {
      nome: modulo.nome,
      coperti: matcher.coperti,
      totale: matcher.totale,
      slotScoperti: matcher.slotScoperti(),
    };
  });

  coperture.sort((a, b) => b.coperti / b.totale - a.coperti / a.totale);
  return { coperture, matchers };
}

/** Copertura degli 11 moduli Mantra con la rosa attuale, ordinati dal piu' vicino al completamento. */
export function computeCoperturaModuli(players: Player[]): ModuloCoverage[] {
  return calcolaCoperturaModuli(players).coperture;
}

const MODULI_CONSIDERATI = 3;

export interface RuoloNecessario {
  ruolo: RuoloMantra;
  punteggio: number;
}

/** Aggrega gli slot mancanti dei moduli piu' vicini al completamento in una classifica dei ruoli piu' richiesti. */
export function computeRuoliNecessari(coperture: ModuloCoverage[], topN = MODULI_CONSIDERATI): RuoloNecessario[] {
  const promettenti = coperture.slice(0, topN);
  const tally = new Map<RuoloMantra, number>();

  promettenti.forEach((modulo, idx) => {
    const peso = topN - idx;
    modulo.slotScoperti.forEach((slot) => {
      slot.forEach((ruolo) => {
        tally.set(ruolo, (tally.get(ruolo) ?? 0) + peso);
      });
    });
  });

  return Array.from(tally.entries())
    .map(([ruolo, punteggio]) => ({ ruolo, punteggio }))
    .sort((a, b) => b.punteggio - a.punteggio);
}

const PESO_NECESSITA = 10;

function getSuggestionsMantra(players: Player[], settings: Settings): PlayerSuggestion[] {
  const stato = computeMantraStato(players, settings);
  const { coperture, matchers } = calcolaCoperturaModuli(players);
  const promettenti = coperture.slice(0, MODULI_CONSIDERATI);

  return players
    .filter((p) => p.stato === "disponibile")
    .map((player) => {
      const ruoli = player.ruoliMantra ?? [];
      if (ruoli.length === 0) {
        return { player, prezzoMedioDisponibile: 0, rapporto: 0, punteggio: 0, consigliato: false };
      }

      const { rapporto, punteggio: scoreValore } = scoreValoreForBudget(
        player.quotazione,
        player.fvm,
        stato.prezzoMedioDisponibile
      );

      const moduliUtili = promettenti
        .filter((modulo) => matchers.get(modulo.nome)!.proveresti(player.id, ruoli))
        .map((modulo) => modulo.nome);

      const punteggio = scoreValore + moduliUtili.length * PESO_NECESSITA;
      const consigliato = stato.postiRimanenti > 0 && (rapporto <= 1.3 || moduliUtili.length > 0);

      return {
        player,
        prezzoMedioDisponibile: stato.prezzoMedioDisponibile,
        rapporto,
        punteggio,
        consigliato,
        moduliUtili,
      };
    })
    .sort((a, b) => b.punteggio - a.punteggio);
}

// ---------------------------------------------------------------------------
// Scarsita' dei titolari per ruolo: con N partecipanti all'asta, quanti
// giocatori "da titolare" restano ancora disponibili in un ruolo prima che
// diventi un problema trovarne uno decente.
// ---------------------------------------------------------------------------

export interface ScarsitaRuolo {
  /** Ruolo Classic o linea Mantra (Portieri/Difensori/Centrocampisti/Attaccanti). */
  chiave: string;
  label: string;
  /** Quanti giocatori "da titolare" in questo ruolo ci si aspetta servano in tutta la lega. */
  titolariTotali: number;
  /** Quanti di quei titolari sono ancora disponibili sul mercato. */
  titolariDisponibili: number;
  /** True quando i titolari rimasti non bastano piu' per un partecipante a testa. */
  allerta: boolean;
}

/**
 * Classic: i "titolari" di un ruolo sono i migliori per quotazione fino a
 * quanti slot quel ruolo occupa moltiplicati per il numero di partecipanti
 * (ogni squadra della lega usa lo stesso numero di slot per ruolo). Se quelli
 * ancora disponibili scendono a non piu' di un partecipante a testa, e' il
 * segnale che il ruolo sta per esaurirsi.
 */
export function computeScarsitaClassic(players: Player[], settings: Settings): ScarsitaRuolo[] {
  const partecipanti = Math.max(1, settings.numeroPartecipanti);
  return RUOLI.map((ruolo) => {
    const delRuolo = [...players.filter((p) => p.ruolo === ruolo)].sort((a, b) => b.quotazione - a.quotazione);
    const titolariTotali = settings.ruoli[ruolo].slot * partecipanti;
    const titolari = delRuolo.slice(0, titolariTotali);
    const titolariDisponibili = titolari.filter((p) => p.stato === "disponibile").length;
    return {
      chiave: ruolo,
      label: ruolo,
      titolariTotali,
      titolariDisponibili,
      allerta: titolariTotali > 0 && titolariDisponibili > 0 && titolariDisponibili <= partecipanti,
    };
  });
}

/**
 * Quanto "conta" in media, per ognuno dei 12 ruoli Mantra, un modulo su 11.
 * Uno slot con piu' ruoli alternativi (es. "W/A") divide il credito tra le
 * alternative invece di contare per intero su ciascuna: un ruolo che e' solo
 * una tra piu' opzioni possibili per uno slot ha una "titolarita' limitata"
 * su quello slot, non una richiesta piena.
 */
function bisognoMedioPerRuoloMantra(): Record<RuoloMantra, number> {
  const somme = {} as Record<RuoloMantra, number>;
  for (const ruolo of RUOLI_MANTRA) somme[ruolo] = 0;
  for (const modulo of MODULI_MANTRA) {
    for (const slot of modulo.slot) {
      const credito = 1 / slot.length;
      for (const ruolo of slot) somme[ruolo] += credito;
    }
  }
  const media = {} as Record<RuoloMantra, number>;
  for (const ruolo of RUOLI_MANTRA) media[ruolo] = somme[ruolo] / MODULI_MANTRA.length;
  return media;
}

/**
 * Mantra: niente slot fissi per ruolo, quindi la scarsita' si stima per
 * ognuno dei 12 ruoli singoli (Por, Dc, Dd, ...) in base a quanto quel ruolo
 * e' richiesto in media dagli 11 moduli tattici (con "titolarita' limitata"
 * per i ruoli che sono solo una tra piu' alternative di uno slot, vedi
 * bisognoMedioPerRuoloMantra), moltiplicato per il numero di partecipanti.
 */
export function computeScarsitaMantra(players: Player[], settings: Settings): ScarsitaRuolo[] {
  const partecipanti = Math.max(1, settings.numeroPartecipanti);
  const bisognoMedio = bisognoMedioPerRuoloMantra();

  return RUOLI_MANTRA.map((ruolo) => {
    const delRuolo = [...players.filter((p) => (p.ruoliMantra ?? []).includes(ruolo))].sort(
      (a, b) => b.quotazione - a.quotazione
    );
    const titolariTotali = Math.round(bisognoMedio[ruolo] * partecipanti);
    const titolari = delRuolo.slice(0, titolariTotali);
    const titolariDisponibili = titolari.filter((p) => p.stato === "disponibile").length;
    return {
      chiave: ruolo,
      label: ruolo,
      titolariTotali,
      titolariDisponibili,
      allerta: titolariTotali > 0 && titolariDisponibili > 0 && titolariDisponibili <= partecipanti,
    };
  });
}

export function computeScarsitaRuoli(players: Player[], settings: Settings): ScarsitaRuolo[] {
  return settings.modalita === "classic" ? computeScarsitaClassic(players, settings) : computeScarsitaMantra(players, settings);
}

// ---------------------------------------------------------------------------
// Livello relativo delle statistiche FPEDIA: invece di fidarsi del colore
// che assegna il sito (che potrebbe non essere sempre presente/coerente), lo
// calcoliamo confrontando ogni valore con lo stesso dato ("Presenze
// 2025-2026", "Algoritmo Fantacalciopedia", ecc.) di tutti gli altri
// giocatori con statistiche FPEDIA: i migliori del gruppo sono "super", i
// peggiori "negativo".
// ---------------------------------------------------------------------------

function numeroPillola(valoreTesto: string): number | undefined {
  const m = valoreTesto.replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!m) return undefined;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : undefined;
}

const SOGLIE_PERCENTILE: [number, LivelloFpedia][] = [
  [0.8, "super"],
  [0.6, "buono"],
  [0.4, "sufficiente"],
  [0.2, "mediocre"],
];

function livelloDaPercentile(percentile: number): LivelloFpedia {
  for (const [soglia, livello] of SOGLIE_PERCENTILE) {
    if (percentile >= soglia) return livello;
  }
  return "negativo";
}

/**
 * Costruisce, dalla rosa di tutti i giocatori con dati FPEDIA, una funzione
 * che restituisce il livello relativo (super/buono/.../negativo) di un
 * singolo valore per una data etichetta. Se per quell'etichetta ci sono
 * troppo pochi altri valori numerici da confrontare, restituisce null
 * (grigio neutro) invece di un giudizio poco significativo.
 */
export function computeLivelliRelativiFpedia(players: Player[]): (label: string, valoreTesto: string) => LivelloFpedia {
  const MINIMO_CAMPIONE = 3;
  const valoriPerLabel = new Map<string, number[]>();

  for (const p of players) {
    for (const pillola of p.fpedia?.pillole ?? []) {
      const n = numeroPillola(pillola.valore);
      if (n === undefined) continue;
      const arr = valoriPerLabel.get(pillola.label);
      if (arr) arr.push(n);
      else valoriPerLabel.set(pillola.label, [n]);
    }
  }
  for (const arr of valoriPerLabel.values()) arr.sort((a, b) => a - b);

  return (label, valoreTesto) => {
    const valore = numeroPillola(valoreTesto);
    if (valore === undefined) return null;
    const arr = valoriPerLabel.get(label);
    if (!arr || arr.length < MINIMO_CAMPIONE) return null;

    let sotto = 0;
    let uguali = 0;
    for (const v of arr) {
      if (v < valore) sotto++;
      else if (v === valore) uguali++;
    }
    const percentile = (sotto + (uguali - 1) / 2) / (arr.length - 1);
    return livelloDaPercentile(percentile);
  };
}
