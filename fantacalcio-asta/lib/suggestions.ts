import { LivelloFpedia, Player, RUOLI, Ruolo, RuoloMantra, Settings } from "./types";
import { MODULI_MANTRA, Modulo, SlotModulo } from "./moduliMantra";
import { costruisciMatchmaker, generaCombinazioniPerPunteggio, MatchmakerModulo } from "./bipartiteMatching";
import { livelloRelativoInCampione } from "./percentile";

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
 * ancora nel suo ruolo (Classic) o nel pool (Mantra): "massimo consigliato"
 * (soglia prudente, SOGLIA_RAPPORTO_CONSIGLIATO * prezzo medio disponibile,
 * con un bonus se l'FVM supera la quotazione) e "tetto di sicurezza"
 * (aritmetico, oltre il quale non basterebbe almeno 1 credito a testa per gli
 * altri slot/posti rimanenti) — un allarme sul prezzo, indipendente da quanto
 * il giocatore valga (vedi invece l'ALG FCP di FPEDIA).
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

export interface SuggerimentoAsta {
  player: Player;
  prezzoMassimo: PrezzoMassimo;
  /** Solo Mantra: nomi dei moduli (tra i piu' vicini al completamento) che questo giocatore aiuterebbe a completare. */
  moduliUtili?: string[];
}

export function getSuggerimentiAsta(players: Player[], settings: Settings): SuggerimentoAsta[] {
  return settings.modalita === "classic"
    ? getSuggerimentiAstaClassic(players, settings)
    : getSuggerimentiAstaMantra(players, settings);
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

function getSuggerimentiAstaClassic(players: Player[], settings: Settings): SuggerimentoAsta[] {
  const roleStats = computeRoleStats(players, settings);

  return players
    .filter((p) => p.stato === "disponibile")
    .map((player) => {
      const stats = roleStats[player.ruolo];
      const prezzoMassimo = computePrezzoMassimo(
        player.quotazione,
        player.fvm,
        stats.budgetResiduoRuolo,
        stats.slotRimanenti,
        stats.prezzoMedioDisponibile
      );
      return { player, prezzoMassimo };
    });
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

function giocatoriMantraPosseduti(players: Player[]): { id: string; ruoli: RuoloMantra[] }[] {
  return players
    .filter((p) => p.stato === "mia" && p.ruoliMantra && p.ruoliMantra.length > 0)
    .map((p) => ({ id: p.id, ruoli: p.ruoliMantra as RuoloMantra[] }));
}

function calcolaCoperturaModuli(players: Player[]): CoperturaModuliInterna {
  const posseduti = giocatoriMantraPosseduti(players);

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

export interface RigaDettaglioModulo {
  /** Set di ruoli accettato da questo/questi slot (es. ["Dc"] oppure ["Dc","B"]): stesso set = stessa riga. */
  slot: SlotModulo;
  coperti: number;
  totale: number;
}

/**
 * Per un modulo, i ruoli previsti raggruppati per set di ruoli accettato
 * (stesso set = stessa riga, es. i 2 slot "Dc" del 3-4-3 diventano un'unica
 * riga "Dc: 2/2") con quanti sono coperti dalla rosa posseduta: usato per il
 * tooltip di dettaglio sui moduli nel pannello Budget.
 */
export function computeDettaglioModulo(players: Player[], modulo: Modulo): RigaDettaglioModulo[] {
  const matcher = costruisciMatchmaker(modulo.slot, giocatoriMantraPosseduti(players));
  const assegnazione = matcher.assegnazioniComplete();

  const righe = new Map<string, RigaDettaglioModulo>();
  modulo.slot.forEach((slot, idx) => {
    const chiave = slot.join("/");
    const riga = righe.get(chiave) ?? { slot, coperti: 0, totale: 0 };
    riga.totale += 1;
    if (assegnazione[idx]) riga.coperti += 1;
    righe.set(chiave, riga);
  });
  return Array.from(righe.values());
}

export interface ClassificaModulo {
  nome: string;
  /**
   * Somma di (ALG FCP × quotazione) dei titolari nella miglior formazione possibile per
   * questo modulo con la rosa attuale — un "valore" che pesa sia la qualità (ALG FCP) sia
   * il costo/prestigio del giocatore (quotazione), non solo la qualità pura. `null` se il
   * modulo non è completamente coprbile con la rosa posseduta (non ha senso confrontarne
   * il valore: non è nemmeno schierabile).
   */
  valore: number | null;
}

/**
 * Classifica tutti i moduli Mantra per "valore" della miglior formazione titolare
 * possibile con la rosa attuale (solo tra quelli completamente coprbili), per capire
 * quale formazione schierare offrirebbe il roster più forte — usata per evidenziare le
 * prime 3 nel pannello Budget.
 */
export function computeClassificaValoreModuli(players: Player[]): ClassificaModulo[] {
  const posseduti = giocatoriMantraPosseduti(players);
  const byId = new Map(players.map((p) => [p.id, p]));
  const valoreGiocatore = (id: string) => {
    const p = byId.get(id);
    return (p?.fpedia?.algFcp ?? 0) * (p?.quotazione ?? 0);
  };

  return MODULI_MANTRA.map((modulo) => {
    const matcher = costruisciMatchmaker(modulo.slot, posseduti);
    if (matcher.coperti < matcher.totale) return { nome: modulo.nome, valore: null };
    const combinazioni = generaCombinazioniPerPunteggio(modulo.slot, posseduti, valoreGiocatore, 1);
    return { nome: modulo.nome, valore: combinazioni[0]?.punteggioTotale ?? null };
  });
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

function getSuggerimentiAstaMantra(players: Player[], settings: Settings): SuggerimentoAsta[] {
  const stato = computeMantraStato(players, settings);
  const { coperture, matchers } = calcolaCoperturaModuli(players);
  const promettenti = coperture.slice(0, MODULI_CONSIDERATI);

  return players
    .filter((p) => p.stato === "disponibile")
    .map((player) => {
      const ruoli = player.ruoliMantra ?? [];
      const prezzoMassimo = computePrezzoMassimo(
        player.quotazione,
        player.fvm,
        stato.budgetResiduo,
        stato.postiRimanenti,
        stato.prezzoMedioDisponibile
      );
      if (ruoli.length === 0) {
        return { player, prezzoMassimo };
      }

      const moduliUtili = promettenti
        .filter((modulo) => matchers.get(modulo.nome)!.proveresti(player.id, ruoli))
        .map((modulo) => modulo.nome);

      return { player, prezzoMassimo, moduliUtili };
    });
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
// Valore medio di acquisto: budget residuo diviso per i giocatori ancora
// mancanti per completare una rosa valida (min 1 credito a testa, portieri
// inclusi). Se la rosa e' gia' completa, mostra l'intero budget residuo
// invece di dividere per zero.
// ---------------------------------------------------------------------------

/**
 * Classic: la somma degli slotRimanenti sui 4 ruoli e' gia' esattamente il
 * numero di giocatori mancanti — il minimo di portieri e' automaticamente
 * rispettato perche' il ruolo P ha il proprio slot dedicato, indipendente
 * dagli altri 3. Mantra: niente slot per ruolo, quindi il numero di
 * giocatori mancanti e' il massimo tra "quanti mancano in totale per
 * arrivare al minimo di rosa" e "quanti portieri mancano per arrivare al
 * minimo configurato in Settings" (l'unico valore "minimo portieri" che
 * esiste in questa app, riusato anche qui pur non essendo mostrato in UI in
 * modalita' Mantra) — se mancano piu' portieri di quanti giocatori
 * mancherebbero in totale, quei portieri coprono comunque anche il
 * fabbisogno totale, quindi il massimo tra i due e' sempre corretto.
 */
export function computeValoreMedioAcquisto(players: Player[], settings: Settings): number {
  const budgetResiduo = computeBudgetResiduoTotale(players, settings);

  if (settings.modalita === "classic") {
    const roleStats = computeRoleStats(players, settings);
    const giocatoriMancanti = RUOLI.reduce((sum, ruolo) => sum + roleStats[ruolo].slotRimanenti, 0);
    return giocatoriMancanti > 0 ? budgetResiduo / giocatoriMancanti : budgetResiduo;
  }

  const acquistati = players.filter((p) => p.stato === "mia").length;
  const mancantiTotale = Math.max(0, settings.mantra.minGiocatori - acquistati);
  const portieriPosseduti = players.filter((p) => p.stato === "mia" && (p.ruoliMantra ?? []).includes("Por")).length;
  const mancantiPortieri = Math.max(0, settings.ruoli.P.slot - portieriPosseduti);
  const giocatoriMancanti = Math.max(mancantiTotale, mancantiPortieri);
  return giocatoriMancanti > 0 ? budgetResiduo / giocatoriMancanti : budgetResiduo;
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
