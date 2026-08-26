import { LivelloFpedia, Player, Ruolo, RuoloMantra, Settings } from "./types";
import { computeScore } from "./score";
import { computeCoperturaModuli, computeRoleStats, computeRuoliNecessari } from "./suggestions";
import { livelloRelativoInCampione, percentualeRelativaInCampione } from "./percentile";

// ---------------------------------------------------------------------------
// "Urgenza": quanto e' urgente assicurarsi QUESTO giocatore ORA, in base a
// come sta evolvendo l'asta (la mia rosa + gli acquisti di chiunque altro) —
// non quanto e' forte in assoluto (quello e' Score, lib/score.ts). Si
// ricalcola da solo ad ogni acquisto perche' letto sempre dal roster live
// dello store, come Score. A differenza di Score non richiede dati FPEDIA:
// basta un ruolo valido. Pesi nominati qui sotto, facili da ritoccare.
// ---------------------------------------------------------------------------

const PESO_BISOGNO_RUOLO = 20;
const PESO_ESAURIMENTO_FASCE = 20;
const PESO_TEMPERATURA_MERCATO = 15;
const PESO_DOMANDA_OFFERTA = 10;
/** Oltre questo rapporto presi/disponibili il segnale smette di crescere ulteriormente. */
const TETTO_DOMANDA_OFFERTA = 5;

export interface DettaglioUrgenza {
  bisognoRuolo: number;
  esaurimentoFasce: number;
  temperaturaMercato: number;
  domandaOfferta: number;
  /** Quale ruolo ha determinato il punteggio (rilevante per i multi-ruolo Mantra). */
  ruoloUsato: string;
  totale: number;
}

interface FasceRuolo {
  numFasce: number;
  fasciaDiGiocatore: Map<string, number>;
  /** La fascia piu' bassa (0 = migliore) con almeno un giocatore ancora disponibile. */
  fasciaMigliorDisponibile: number;
}

/**
 * Divide tutti i giocatori di un ruolo in fasce da `numeroPartecipanti`
 * ciascuna, ordinate per Score decrescente (chi non ha Score va in fondo):
 * la fascia 0 sono i migliori `numeroPartecipanti` giocatori del ruolo — "in
 * un'asta equilibrata uno a testa", prenderne di piu' e' un vantaggio.
 */
function costruisciFasce(
  giocatoriRuolo: Player[],
  score: (p: Player) => { totale: number } | null,
  numeroPartecipanti: number
): FasceRuolo {
  const dimensioneFascia = Math.max(1, numeroPartecipanti);
  const ordinati = [...giocatoriRuolo].sort(
    (a, b) => (score(b)?.totale ?? -Infinity) - (score(a)?.totale ?? -Infinity)
  );
  const numFasce = Math.max(1, Math.floor(ordinati.length / dimensioneFascia));

  const fasciaDiGiocatore = new Map<string, number>();
  ordinati.forEach((p, i) => {
    fasciaDiGiocatore.set(p.id, Math.min(numFasce - 1, Math.floor(i / dimensioneFascia)));
  });

  let fasciaMigliorDisponibile = numFasce; // nessuno disponibile: "oltre l'ultima fascia"
  for (const p of ordinati) {
    if (p.stato !== "disponibile") continue;
    const fascia = fasciaDiGiocatore.get(p.id) ?? numFasce;
    if (fascia < fasciaMigliorDisponibile) fasciaMigliorDisponibile = fascia;
  }

  return { numFasce, fasciaDiGiocatore, fasciaMigliorDisponibile };
}

/** Prezzi pagati dagli avversari in questo ruolo vs quotazione: sopra 1 = mercato "caldo". */
function temperaturaMercatoRuolo(giocatoriRuolo: Player[]): number {
  const pagati = giocatoriRuolo.filter(
    (p) => p.stato === "altrui" && p.prezzoPagato !== undefined && p.quotazione > 0
  );
  if (pagati.length === 0) return 0;
  const mediaRapporto =
    pagati.reduce((sum, p) => sum + (p.prezzoPagato as number) / p.quotazione, 0) / pagati.length;
  return (mediaRapporto - 1) * PESO_TEMPERATURA_MERCATO;
}

/** Giocatori del ruolo gia' presi (da chiunque) vs ancora disponibili, in tutta la lega. */
function domandaOffertaRuolo(giocatoriRuolo: Player[]): number {
  const presi = giocatoriRuolo.filter((p) => p.stato === "mia" || p.stato === "altrui").length;
  const disponibili = giocatoriRuolo.filter((p) => p.stato === "disponibile").length;
  const rapporto = Math.min(TETTO_DOMANDA_OFFERTA, presi / Math.max(1, disponibili));
  return rapporto * PESO_DOMANDA_OFFERTA;
}

function bisognoRuoloClassic(ruolo: Ruolo, players: Player[], settings: Settings): number {
  const stats = computeRoleStats(players, settings)[ruolo];
  if (stats.slotTotali <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - stats.slotOccupati / stats.slotTotali)) * PESO_BISOGNO_RUOLO;
}

/** Mantra non ha slot fissi per ruolo: riusa computeRuoliNecessari (gap dei moduli piu' vicini al completamento), gia' zero se il ruolo e' coperto abbastanza. */
function bisognoRuoloMantraMap(players: Player[]): Map<RuoloMantra, number> {
  const necessari = computeRuoliNecessari(computeCoperturaModuli(players));
  const massimo = necessari.reduce((max, r) => Math.max(max, r.punteggio), 0);
  const mappa = new Map<RuoloMantra, number>();
  if (massimo <= 0) return mappa;
  for (const r of necessari) mappa.set(r.ruolo, (r.punteggio / massimo) * PESO_BISOGNO_RUOLO);
  return mappa;
}

/**
 * Costruisce, dalla rosa e dal mercato attuali, una funzione che calcola il
 * dettaglio di Urgenza per un singolo giocatore. Per i multi-ruolo Mantra
 * prende il ruolo con l'urgenza piu' alta tra quelli idonei (`ruoloUsato`
 * riporta quale). Ritorna null solo se il giocatore non ha nessun ruolo
 * valido su cui calcolare nulla (Mantra senza colonna RM nel listino).
 */
export function computeUrgenza(players: Player[], settings: Settings): (player: Player) => DettaglioUrgenza | null {
  const isMantra = settings.modalita === "mantra";
  const score = computeScore(players, settings);
  const numeroPartecipanti = Math.max(1, settings.numeroPartecipanti);

  const giocatoriPerRuolo = new Map<string, Player[]>();
  function aggiungiA(ruolo: string, p: Player) {
    const arr = giocatoriPerRuolo.get(ruolo);
    if (arr) arr.push(p);
    else giocatoriPerRuolo.set(ruolo, [p]);
  }
  for (const p of players) {
    if (isMantra) {
      for (const r of p.ruoliMantra ?? []) aggiungiA(r, p);
    } else {
      aggiungiA(p.ruolo, p);
    }
  }

  const fascePerRuolo = new Map<string, FasceRuolo>();
  function fasceDi(ruolo: string): FasceRuolo {
    let f = fascePerRuolo.get(ruolo);
    if (!f) {
      f = costruisciFasce(giocatoriPerRuolo.get(ruolo) ?? [], score, numeroPartecipanti);
      fascePerRuolo.set(ruolo, f);
    }
    return f;
  }

  const bisognoMantra = isMantra ? bisognoRuoloMantraMap(players) : null;

  function dettaglioPerRuolo(player: Player, ruolo: string): DettaglioUrgenza {
    const giocatoriRuolo = giocatoriPerRuolo.get(ruolo) ?? [];
    const fasce = fasceDi(ruolo);
    const fasciaGiocatore = fasce.fasciaDiGiocatore.get(player.id) ?? fasce.numFasce;

    const esaurimentoBase = fasce.numFasce > 1 ? fasce.fasciaMigliorDisponibile / (fasce.numFasce - 1) : 0;
    const pesoFasciaGiocatore = (fasce.numFasce - fasciaGiocatore) / fasce.numFasce;
    const esaurimentoFasce = Math.min(1, esaurimentoBase) * pesoFasciaGiocatore * PESO_ESAURIMENTO_FASCE;

    const bisognoRuolo = isMantra
      ? bisognoMantra?.get(ruolo as RuoloMantra) ?? 0
      : bisognoRuoloClassic(ruolo as Ruolo, players, settings);

    const temperaturaMercato = temperaturaMercatoRuolo(giocatoriRuolo);
    const domandaOfferta = domandaOffertaRuolo(giocatoriRuolo);

    const totale = bisognoRuolo + esaurimentoFasce + temperaturaMercato + domandaOfferta;

    return { bisognoRuolo, esaurimentoFasce, temperaturaMercato, domandaOfferta, ruoloUsato: ruolo, totale };
  }

  return (player) => {
    if (!isMantra) return dettaglioPerRuolo(player, player.ruolo);

    const ruoli = player.ruoliMantra ?? [];
    if (ruoli.length === 0) return null;

    let migliore: DettaglioUrgenza | null = null;
    for (const r of ruoli) {
      const d = dettaglioPerRuolo(player, r);
      if (!migliore || d.totale > migliore.totale) migliore = d;
    }
    return migliore;
  };
}

/** Stesso semaforo relativo a 5 fasce di Score, sul campione dei totali di Urgenza. */
export function computeLivelloUrgenza(
  players: Player[],
  urgenza: (player: Player) => DettaglioUrgenza | null
): (player: Player) => LivelloFpedia {
  const campione = players.map((p) => urgenza(p)?.totale).filter((v): v is number => v !== undefined);

  return (player) => {
    const dettaglio = urgenza(player);
    if (!dettaglio) return null;
    return livelloRelativoInCampione(dettaglio.totale, campione);
  };
}

/**
 * Come computeLivelloUrgenza, ma come numero continuo 0-100 (100 = il
 * giocatore con l'urgenza piu' alta del campione) invece che a 5 fasce: il
 * totale grezzo non ha un range fisso (puo' restare vicino a zero se nessuno
 * dei 4 segnali e' ancora scattato, es. a inizio asta), quindi in tabella si
 * mostra questo percentile — sempre confrontabile — invece del totale.
 */
export function computePercentualeUrgenza(
  players: Player[],
  urgenza: (player: Player) => DettaglioUrgenza | null
): (player: Player) => number | null {
  const campione = players.map((p) => urgenza(p)?.totale).filter((v): v is number => v !== undefined);

  return (player) => {
    const dettaglio = urgenza(player);
    if (!dettaglio) return null;
    return percentualeRelativaInCampione(dettaglio.totale, campione);
  };
}

export const DETTAGLIO_URGENZA_LABEL: Record<Exclude<keyof DettaglioUrgenza, "totale" | "ruoloUsato">, string> = {
  bisognoRuolo: "Bisogno di ruolo",
  esaurimentoFasce: "Esaurimento fasce",
  temperaturaMercato: "Temperatura mercato",
  domandaOfferta: "Domanda/offerta lega",
};
