import {
  FpediaStagionePrecedente,
  LineaMantra,
  LivelloFpedia,
  Player,
  RUOLO_MANTRA_AVANZAMENTO,
  Ruolo,
  RuoloMantra,
  Settings,
  lineaMantraGiocatore,
} from "./types";
import { livelloRelativoInCampione } from "./percentile";

// ---------------------------------------------------------------------------
// Punteggio "Priorita'": quanto e' forte/affidabile un giocatore (gol, assist,
// voti costanti, pochi cartellini, titolarita'), a differenza del "Punteggio"
// esistente in lib/suggestions.ts che misura solo la convenienza economica
// (quotazione/FVM vs budget). Ogni componente e' una costante nominata qui
// sotto, cosi' da poter essere ritoccata senza spulciare le formule.
// ---------------------------------------------------------------------------

/** Un gol pesa di piu' per chi normalmente ne fa meno (difensori/centrocampisti) che per un attaccante puro. */
const PESO_GOL: Record<LineaMantra, number> = {
  Portieri: 0,
  Difensori: 3,
  Centrocampisti: 2,
  Attaccanti: 1,
};

const LINEA_DA_RUOLO_CLASSIC: Record<Ruolo, LineaMantra> = {
  P: "Portieri",
  D: "Difensori",
  C: "Centrocampisti",
  A: "Attaccanti",
};

/** Un assist non e' catturato meglio da nessun ruolo in particolare: peso fisso, a differenza del gol. */
const PESO_ASSIST = 2;

/** (mediaVoto - 6) * K: sopra la sufficienza aggiunge punti, sotto ne toglie. */
const K_VOTO_MEDIO = 10;

/** Bonus se la media voto della stagione corrente e' vicina a quella dell'ultima stagione precedente (affidabilita'). */
const BONUS_COSTANZA_STRETTA = 2; // scarto <= 0.2
const BONUS_COSTANZA_LARGA = 1; // scarto <= 0.5

/** Moltiplica il tasso (ammonizioni + espulsioni*2) / presenze giocate: normalizzato, non un conteggio assoluto. */
const PESO_MALUS_CARTELLINI = 15;
/** Malus fisso aggiuntivo se FPEDIA segnala esplicitamente il tag "Falloso" (rischio persistente oltre il conteggio di stagione). */
const MALUS_TAG_FALLOSO = -3;

/** Piccolo peso positivo per ogni presenza attesa: completa (non sostituisce) la titolarita'. */
const PESO_PRESENZE_PREVISTE = 0.3;

const BONUS_RIGORISTA = 6;
const BONUS_PUNIZIONI = 3;
const BONUS_ANGOLI = 2;
/** Bonus scouting FPEDIA espliciti, gia' scaricati e non ancora usati nel punteggio. */
const BONUS_TAG_SCOUTING = 2; // "Piazzati" / "Outsider" (piazzati) / "Buona Media" (voto)

/** Segnale di titolarita' dal trend testuale delle notizie (lib/matchNews.ts). */
const BONUS_TREND_POSITIVO = 8; // "Titolare fisso" / "In buona forma"
const MALUS_TREND_NEGATIVO = -10; // "In panchina" / "Squalificato" / "Infortunato" (testuale)
/** Segnale di titolarita' dal tag FPEDIA. */
const BONUS_TAG_TITOLARE = 4;
const MALUS_TAG_PANCHINARO = -6;
/** Tetto sulla somma trend+tag: sono due segnali indipendenti ma imperfetti, non vogliamo doppiarli se puntano nella stessa direzione. */
const TETTO_TITOLARITA = 12;
/** Malus forte a parte per il flag strutturato (liste "infortunati" di FPEDIA), piu' affidabile del trend testuale. */
const MALUS_INFORTUNATO_STRUTTURATO = -20;

/** Bonus di versatilita' (solo Mantra): moltiplica lo spread di RUOLO_MANTRA_AVANZAMENTO tra i ruoli idonei. */
const PESO_VERSATILITA = 2;

/** Bonus per un giocatore disponibile che fa da "assicurazione" (stessa squadra reale, ruolo compatibile) a un titolare gia' posseduto. */
const BONUS_BACKUP_TITOLARE = 5;

export interface DettaglioPriorita {
  golAttesi: number;
  assistAttesi: number;
  votoMedio: number;
  costanzaVoto: number;
  malusCartellini: number;
  presenze: number;
  piazzati: number;
  titolarita: number;
  versatilita: number;
  backupTitolare: number;
  totale: number;
}

function haTag(p: Player, label: string): boolean {
  return (p.fpedia?.tags ?? []).some((t) => t.label.toLowerCase() === label.toLowerCase());
}

function annoInizioStagione(stagione: string): number {
  const n = Number(stagione.slice(0, 4));
  return Number.isFinite(n) ? n : 0;
}

/** L'ultima stagione precedente in ordine cronologico (l'array non ha un ordine garantito, dipende dal DOM del sito). */
function ultimaStagionePrecedente(stagioni: FpediaStagionePrecedente[]): FpediaStagionePrecedente | undefined {
  return [...stagioni].sort((a, b) => annoInizioStagione(b.stagione) - annoInizioStagione(a.stagione))[0];
}

function segnaleTrend(trendVoti: string | undefined): number {
  if (trendVoti === "Titolare fisso" || trendVoti === "In buona forma") return BONUS_TREND_POSITIVO;
  if (trendVoti === "In panchina" || trendVoti === "Squalificato" || trendVoti === "Infortunato") return MALUS_TREND_NEGATIVO;
  return 0;
}

function segnaleTag(p: Player): number {
  let s = 0;
  if (haTag(p, "Titolare")) s += BONUS_TAG_TITOLARE;
  if (haTag(p, "Panchinaro")) s += MALUS_TAG_PANCHINARO;
  return s;
}

/** Un giocatore posseduto conta come "titolare" ai fini del bonus backup solo se i segnali disponibili sono nel complesso positivi e non e' infortunato. */
function isTitolarePositivo(p: Player): boolean {
  return !p.infortunato && segnaleTrend(p.trendVoti) + segnaleTag(p) > 0;
}

function ruoliCompatibili(a: Player, b: Player, isMantra: boolean): boolean {
  return isMantra
    ? (a.ruoliMantra ?? []).some((r) => (b.ruoliMantra ?? []).includes(r))
    : a.ruolo === b.ruolo;
}

function spreadVersatilita(ruoliMantra: RuoloMantra[] | undefined): number {
  if (!ruoliMantra || ruoliMantra.length < 2) return 0;
  const valori = ruoliMantra.map((r) => RUOLO_MANTRA_AVANZAMENTO[r]);
  return Math.max(...valori) - Math.min(...valori);
}

/**
 * Costruisce, dalla rosa attuale, una funzione che calcola il dettaglio del
 * punteggio Priorita' per un singolo giocatore. Restituisce null se il
 * giocatore non ha alcun dato FPEDIA (nessuna base per stimare nulla, stesso
 * criterio di lib/fantasolidita.ts).
 */
export function computePriorita(players: Player[], settings: Settings): (player: Player) => DettaglioPriorita | null {
  const isMantra = settings.modalita === "mantra";
  const titolariPosseduti = players.filter((p) => p.stato === "mia" && isTitolarePositivo(p));

  return (player) => {
    const fpedia = player.fpedia;
    if (!fpedia) return null;

    const linea: LineaMantra | undefined = isMantra
      ? lineaMantraGiocatore(player.ruoliMantra)
      : LINEA_DA_RUOLO_CLASSIC[player.ruolo];
    const pesoGolLinea = linea ? PESO_GOL[linea] : 0;

    const midGol = fpedia.golPrevisti ? (fpedia.golPrevisti[0] + fpedia.golPrevisti[1]) / 2 : 0;
    const golAttesi = midGol * pesoGolLinea;

    const midAssist = fpedia.assistPrevisti ? (fpedia.assistPrevisti[0] + fpedia.assistPrevisti[1]) / 2 : 0;
    const assistAttesi = midAssist * PESO_ASSIST;

    let votoMedio = fpedia.mediaVoto !== undefined ? (fpedia.mediaVoto - 6) * K_VOTO_MEDIO : 0;
    if (haTag(player, "Buona Media")) votoMedio += BONUS_TAG_SCOUTING;

    let costanzaVoto = 0;
    const ultima = ultimaStagionePrecedente(fpedia.stagioniPrecedenti);
    if (fpedia.mediaVoto !== undefined && ultima?.mediaVoto !== undefined) {
      const scarto = Math.abs(fpedia.mediaVoto - ultima.mediaVoto);
      if (scarto <= 0.2) costanzaVoto = BONUS_COSTANZA_STRETTA;
      else if (scarto <= 0.5) costanzaVoto = BONUS_COSTANZA_LARGA;
    }

    const presenzeStagione = fpedia.presenze ?? 0;
    const tassoCartellini = (fpedia.ammonizioni ?? 0) + (fpedia.espulsioni ?? 0) * 2;
    let malusCartellini = -(tassoCartellini / Math.max(1, presenzeStagione)) * PESO_MALUS_CARTELLINI;
    if (haTag(player, "Falloso")) malusCartellini += MALUS_TAG_FALLOSO;

    const midPresenze = fpedia.presenzePreviste
      ? (fpedia.presenzePreviste[0] + fpedia.presenzePreviste[1]) / 2
      : 0;
    const presenze = midPresenze * PESO_PRESENZE_PREVISTE;

    let piazzati = 0;
    if (player.rigorista) piazzati += BONUS_RIGORISTA;
    if (player.tiratorePunizioni) piazzati += BONUS_PUNIZIONI;
    if (player.tiratoreAngoli) piazzati += BONUS_ANGOLI;
    if (haTag(player, "Piazzati")) piazzati += BONUS_TAG_SCOUTING;
    if (haTag(player, "Outsider")) piazzati += BONUS_TAG_SCOUTING;

    const titolaritaRaw = segnaleTrend(player.trendVoti) + segnaleTag(player);
    const titolaritaCapped = Math.max(-TETTO_TITOLARITA, Math.min(TETTO_TITOLARITA, titolaritaRaw));
    const titolarita = titolaritaCapped + (player.infortunato ? MALUS_INFORTUNATO_STRUTTURATO : 0);

    const versatilita = isMantra ? spreadVersatilita(player.ruoliMantra) * PESO_VERSATILITA : 0;

    const backupTitolare = titolariPosseduti.some(
      (t) => t.id !== player.id && t.squadra === player.squadra && ruoliCompatibili(t, player, isMantra)
    )
      ? BONUS_BACKUP_TITOLARE
      : 0;

    const totale =
      golAttesi +
      assistAttesi +
      votoMedio +
      costanzaVoto +
      malusCartellini +
      presenze +
      piazzati +
      titolarita +
      versatilita +
      backupTitolare;

    return {
      golAttesi,
      assistAttesi,
      votoMedio,
      costanzaVoto,
      malusCartellini,
      presenze,
      piazzati,
      titolarita,
      versatilita,
      backupTitolare,
      totale,
    };
  };
}

/**
 * Livello relativo (5 fasce) del totale di Priorita' rispetto a tutti gli
 * altri giocatori con dati sufficienti per calcolarlo — stesso semaforo di
 * lib/fantasolidita.ts, cosi' il colore del badge in tabella e' coerente col
 * resto dell'app.
 */
export function computeLivelloPriorita(
  players: Player[],
  priorita: (player: Player) => DettaglioPriorita | null
): (player: Player) => LivelloFpedia {
  const campione = players
    .map((p) => priorita(p)?.totale)
    .filter((v): v is number => v !== undefined);

  return (player) => {
    const dettaglio = priorita(player);
    if (!dettaglio) return null;
    return livelloRelativoInCampione(dettaglio.totale, campione);
  };
}

export const DETTAGLIO_PRIORITA_LABEL: Record<Exclude<keyof DettaglioPriorita, "totale">, string> = {
  golAttesi: "Gol attesi",
  assistAttesi: "Assist attesi",
  votoMedio: "Media voto",
  costanzaVoto: "Costanza voto",
  malusCartellini: "Cartellini",
  presenze: "Presenze attese",
  piazzati: "Piazzati/scouting",
  titolarita: "Titolarità",
  versatilita: "Versatilità ruoli",
  backupTitolare: "Assicurazione titolare",
};
