import { LivelloFpedia, Player, RUOLI, RUOLI_MANTRA, Ruolo, RuoloMantra, Settings } from "./types";
import { MODULI_MANTRA, SlotModulo } from "./moduliMantra";
import { costruisciMatchmaker, MatchmakerModulo } from "./bipartiteMatching";
import { livelloRelativoInCampione } from "./percentile";
import { computeLivelloValoreAtteso, computeValoreAtteso, ValoreAtteso } from "./valoreAtteso";

export { livelloRelativoInCampione } from "./percentile";

// ---------------------------------------------------------------------------
// Comune (Classic + Mantra)
// ---------------------------------------------------------------------------

export function computeBudgetResiduoTotale(players: Player[], settings: Settings): number {
  const speso = players
    .filter((p) => p.stato === "mia")
    .reduce((sum, p) => sum + (p.prezzoPagato ?? 0), 0);
  return settings.budgetTotale - speso;
}

/** Sopra questo rapporto (quotazione / prezzo medio disponibile) un giocatore smette di essere "consigliato": stesso limite usato per il prezzo massimo. */
export const SOGLIA_RAPPORTO_CONSIGLIATO = 1.3;

export interface PrezzoMassimo {
  /** Oltre questo prezzo, agli slot/posti rimanenti non basterebbe almeno 1 a testa: limite aritmetico, non un consiglio. */
  tettoSicurezza: number;
  /** Prudente: soglia "consigliato" (prezzoMedioDisponibile * SOGLIA_RAPPORTO_CONSIGLIATO) + bonus se l'FVM supera la quotazione, mai oltre il tetto di sicurezza. */
  massimoConsigliato: number;
}

/**
 * Calcola il prezzo massimo per un giocatore dato quanto budget/slot restano
 * ancora nel suo ruolo (Classic) o nel pool (Mantra). Riusa lo stesso bonus
 * FVM di scoreValoreForBudget cosi' il "massimo consigliato" e' coerente con
 * la soglia che gia' determina "consigliato" in tabella, non un numero
 * inventato a parte.
 */
export function computePrezzoMassimo(
  quotazione: number,
  fvm: number | undefined,
  budgetResiduoDisponibile: number,
  slotRimanenti: number,
  prezzoMedioDisponibile: number
): PrezzoMassimo {
  if (slotRimanenti <= 0) return { tettoSicurezza: 0, massimoConsigliato: 0 };
  const tettoSicurezza = budgetResiduoDisponibile - (slotRimanenti - 1);
  const bonusFvm = fvm && fvm > quotazione ? (fvm - quotazione) * 0.5 : 0;
  const soft = prezzoMedioDisponibile * SOGLIA_RAPPORTO_CONSIGLIATO + bonusFvm;
  return { tettoSicurezza, massimoConsigliato: Math.min(tettoSicurezza, Math.round(soft)) };
}

export type LivelloRischioSforamento = "ok" | "attenzione" | "sforamento";

export interface RischioSforamento {
  livello: LivelloRischioSforamento;
  messaggio: string;
}

/**
 * Valuta se un prezzo (anche solo ipotizzato mentre si digita) rischia di
 * compromettere il resto della rosa: "sforamento" se supera il tetto
 * aritmetico (non resterebbe abbastanza per gli slot ancora da riempire),
 * "attenzione" se supera solo la soglia prudente.
 */
export function valutaRischioSforamento(prezzo: number, massimo: PrezzoMassimo): RischioSforamento {
  if (prezzo > massimo.tettoSicurezza) {
    return {
      livello: "sforamento",
      messaggio: `A ${prezzo} rischi di non avere più budget sufficiente per completare la rosa nei posti rimanenti (tetto: ${Math.round(massimo.tettoSicurezza)}).`,
    };
  }
  if (prezzo > massimo.massimoConsigliato) {
    return {
      livello: "attenzione",
      messaggio: `Sopra il massimo consigliato (${Math.round(massimo.massimoConsigliato)}): valuta se vale la pena a scapito degli altri slot.`,
    };
  }
  return { livello: "ok", messaggio: "Nel budget consigliato." };
}

export interface PlayerSuggestion {
  player: Player;
  prezzoMedioDisponibile: number;
  rapporto: number;
  punteggio: number;
  consigliato: boolean;
  prezzoMassimo: PrezzoMassimo;
  /** Solo Classic: il ruolo su cui e' stato calcolato il punteggio. */
  ruoloUsato?: Ruolo;
  /** Solo Mantra: nomi dei moduli (tra i piu' vicini al completamento) che questo giocatore aiuterebbe a completare. */
  moduliUtili?: string[];
  /**
   * Stima dei punti fantacalcio attesi in stagione (gol/assist/media voto/malus
   * previsti da FPEDIA): dimensione puramente informativa, aggiunta qui solo
   * per comodita' di lookup — NON influenza punteggio/consigliato/rapporto
   * sopra, che restano basati solo su quotazione/FVM/budget come prima,
   * perche' funzionano per ogni giocatore mentre il valore atteso esiste solo
   * per chi e' gia' stato aggiornato da FPEDIA.
   */
  valoreAtteso?: ValoreAtteso | null;
  livelloValoreAtteso?: LivelloFpedia;
}

export function getSuggestions(players: Player[], settings: Settings): PlayerSuggestion[] {
  const base =
    settings.modalita === "classic" ? getSuggestionsClassic(players, settings) : getSuggestionsMantra(players, settings);

  const livelloValoreAttesoDi = computeLivelloValoreAtteso(players, settings);
  return base.map((s) => ({
    ...s,
    valoreAtteso: computeValoreAtteso(s.player),
    livelloValoreAtteso: livelloValoreAttesoDi(s.player),
  }));
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
      const consigliato = stats.slotRimanenti > 0 && rapporto <= SOGLIA_RAPPORTO_CONSIGLIATO;
      const prezzoMassimo = computePrezzoMassimo(
        player.quotazione,
        player.fvm,
        stats.budgetResiduoRuolo,
        stats.slotRimanenti,
        stats.prezzoMedioDisponibile
      );
      return {
        player,
        prezzoMedioDisponibile: stats.prezzoMedioDisponibile,
        rapporto,
        punteggio,
        consigliato,
        prezzoMassimo,
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

export interface VoceSpesaMantra {
  ruolo: RuoloMantra;
  punteggioNecessita: number;
  /** Quota del budget residuo suggerita per questo ruolo, proporzionale alla sua necessità nei moduli più vicini al completamento. */
  quotaBudgetSuggerita: number;
}

/**
 * In Mantra non ci sono slot fissi per ruolo, quindi un piano di spesa non
 * puo' essere una partizione rigida del budget come in Classic: qui si
 * distribuisce il budget residuo proporzionalmente a quanto ogni ruolo e'
 * richiesto dai moduli piu' vicini al completamento (computeRuoliNecessari).
 * E' volutamente una guida approssimativa, non una prenotazione — i ruoli
 * Mantra si sovrappongono (un W puo' riempire anche uno slot W/A), quindi le
 * quote non sommano necessariamente al budget residuo.
 */
export function computePianoSpesaMantra(players: Player[], settings: Settings, topN = 5): VoceSpesaMantra[] {
  const stato = computeMantraStato(players, settings);
  if (stato.postiRimanenti <= 0 || stato.budgetResiduo <= 0) return [];

  const necessari = computeRuoliNecessari(computeCoperturaModuli(players)).filter((r) => r.punteggio > 0);
  const totale = necessari.reduce((sum, r) => sum + r.punteggio, 0);
  if (totale === 0) return [];

  return necessari.slice(0, topN).map((r) => ({
    ruolo: r.ruolo,
    punteggioNecessita: r.punteggio,
    quotaBudgetSuggerita: Math.round((r.punteggio / totale) * stato.budgetResiduo),
  }));
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
        return {
          player,
          prezzoMedioDisponibile: 0,
          rapporto: 0,
          punteggio: 0,
          consigliato: false,
          prezzoMassimo: { tettoSicurezza: 0, massimoConsigliato: 0 },
        };
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
      const consigliato =
        stato.postiRimanenti > 0 && (rapporto <= SOGLIA_RAPPORTO_CONSIGLIATO || moduliUtili.length > 0);
      const prezzoMassimo = computePrezzoMassimo(
        player.quotazione,
        player.fvm,
        stato.budgetResiduo,
        stato.postiRimanenti,
        stato.prezzoMedioDisponibile
      );

      return {
        player,
        prezzoMedioDisponibile: stato.prezzoMedioDisponibile,
        rapporto,
        punteggio,
        consigliato,
        prezzoMassimo,
        moduliUtili,
      };
    })
    .sort((a, b) => b.punteggio - a.punteggio);
}

// ---------------------------------------------------------------------------
// Simulatore "cosa succede se": prova un prezzo ipotetico su un giocatore
// senza assegnarlo davvero, riusando le stesse aggregazioni di sopra su un
// dataset ipotetico invece di duplicarne la logica.
// ---------------------------------------------------------------------------

export interface SimulazioneAcquisto {
  prezzo: number;
  budgetResiduoAttuale: number;
  budgetResiduoSimulato: number;
  // Classic
  roleStatsAttuale?: RoleStats;
  roleStatsSimulato?: RoleStats;
  // Mantra
  mantraStatoAttuale?: MantraStato;
  mantraStatoSimulato?: MantraStato;
}

export function simulaAcquisto(
  players: Player[],
  settings: Settings,
  playerId: string,
  prezzoIpotetico: number
): SimulazioneAcquisto | null {
  const player = players.find((p) => p.id === playerId);
  if (!player) return null;

  const prezzo = Math.max(1, Math.round(prezzoIpotetico) || 1);
  const playersSimulati = players.map((p) =>
    p.id === playerId ? { ...p, stato: "mia" as const, prezzoPagato: prezzo } : p
  );
  const budgetResiduoAttuale = computeBudgetResiduoTotale(players, settings);
  const budgetResiduoSimulato = computeBudgetResiduoTotale(playersSimulati, settings);

  if (settings.modalita === "classic") {
    return {
      prezzo,
      budgetResiduoAttuale,
      budgetResiduoSimulato,
      roleStatsAttuale: computeRoleStats(players, settings)[player.ruolo],
      roleStatsSimulato: computeRoleStats(playersSimulati, settings)[player.ruolo],
    };
  }

  return {
    prezzo,
    budgetResiduoAttuale,
    budgetResiduoSimulato,
    mantraStatoAttuale: computeMantraStato(players, settings),
    mantraStatoSimulato: computeMantraStato(playersSimulati, settings),
  };
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

/**
 * Costruisce, dalla rosa di tutti i giocatori con dati FPEDIA, una funzione
 * che restituisce il livello relativo (super/buono/.../negativo) di un
 * singolo valore per una data etichetta. Se per quell'etichetta ci sono
 * troppo pochi altri valori numerici da confrontare, restituisce null
 * (grigio neutro) invece di un giudizio poco significativo.
 */
export function computeLivelliRelativiFpedia(players: Player[]): (label: string, valoreTesto: string) => LivelloFpedia {
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
    if (!arr) return null;
    return livelloRelativoInCampione(valore, arr);
  };
}
