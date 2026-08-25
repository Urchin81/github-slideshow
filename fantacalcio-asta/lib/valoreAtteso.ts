import { LineaMantra, LivelloFpedia, Player, Ruolo, Settings, lineaMantraGiocatore } from "./types";
import { livelloRelativoInCampione } from "./percentile";

// ---------------------------------------------------------------------------
// Valore atteso fantacalcistico: stima quanti punti (voto + bonus - malus) ci
// si aspetta da un giocatore in una stagione, usando SOLO i dati FPEDIA gia'
// raccolti (previsionali gol/assist/presenze, media voto, ammonizioni ed
// espulsioni). Formula volutamente trasparente (non usa gli score proprietari
// FPEDIA algFcp/punteggioFcp, che restano opachi) cosi' si puo' mostrare in
// un tooltip il dettaglio di come si arriva al numero finale, come gia' si fa
// per "consigliato" in lib/suggestions.ts.
// ---------------------------------------------------------------------------

/** Bonus/malus per punto (stessi pesi del gioco reale, tranne dove indicato). */
export const BONUS_GOL = 3;
export const BONUS_GOL_PORTIERE = 6;
export const BONUS_ASSIST = 1;
export const MALUS_AMMONIZIONE = 0.5;
export const MALUS_ESPULSIONE = 1;
/** Sotto questa soglia di presenze la media voto della stagione corrente e' troppo poco affidabile: si preferisce la stagione precedente o la mediana di ruolo. */
export const SOGLIA_PRESENZE_AFFIDABILE = 5;

export type FonteMediaVoto = "stagioneCorrente" | "stagionePrecedente" | "medianaRuolo";
export type ConfidenzaValoreAtteso = "alta" | "media" | "bassa";

export interface ValoreAtteso {
  totale: number;
  puntiMediaVoto: number;
  puntiGol: number;
  puntiAssist: number;
  /** Negativo: somma di ammonizioni ed espulsioni attese, gia' col segno. */
  puntiMalus: number;
  presenzeAttese: number;
  fonteMediaVoto: FonteMediaVoto;
  confidenza: ConfidenzaValoreAtteso;
}

export interface ContestoValoreAtteso {
  medianaMediaVotoPerRuolo: Partial<Record<Ruolo, number>>;
}

function mediana(valori: number[]): number | undefined {
  if (valori.length === 0) return undefined;
  const ordinati = [...valori].sort((a, b) => a - b);
  const meta = Math.floor(ordinati.length / 2);
  return ordinati.length % 2 === 0 ? (ordinati[meta - 1] + ordinati[meta]) / 2 : ordinati[meta];
}

/** Precalcola, per ogni ruolo Classic, la mediana della media voto tra i giocatori con dati FPEDIA: ultimo fallback quando un giocatore non ha ne' media voto corrente ne' stagione precedente. */
export function computeContestoValoreAtteso(players: Player[]): ContestoValoreAtteso {
  const perRuolo = new Map<Ruolo, number[]>();
  for (const p of players) {
    const voto = p.fpedia?.mediaVoto;
    if (!voto) continue;
    const arr = perRuolo.get(p.ruolo);
    if (arr) arr.push(voto);
    else perRuolo.set(p.ruolo, [voto]);
  }
  const medianaMediaVotoPerRuolo: Partial<Record<Ruolo, number>> = {};
  for (const [ruolo, valori] of perRuolo) {
    const m = mediana(valori);
    if (m !== undefined) medianaMediaVotoPerRuolo[ruolo] = m;
  }
  return { medianaMediaVotoPerRuolo };
}

function puntoMedio(range: [number, number] | undefined): number | undefined {
  if (!range) return undefined;
  return (range[0] + range[1]) / 2;
}

/**
 * Calcola il valore atteso di un giocatore. Restituisce null solo se non c'e'
 * ancora nessun dato FPEDIA o nessuna base di presenze attese: in ogni altro
 * caso le componenti mancanti (es. golPrevisti assente) pesano 0 invece di
 * annullare l'intero calcolo (degrado grazioso).
 */
export function computeValoreAtteso(player: Player, contesto: ContestoValoreAtteso): ValoreAtteso | null {
  const fpedia = player.fpedia;
  if (!fpedia) return null;

  const presenzeAttese =
    puntoMedio(fpedia.presenzePreviste) ??
    (fpedia.presenze && fpedia.presenze > 0 ? fpedia.presenze : undefined) ??
    fpedia.stagioniPrecedenti[0]?.presenze;
  if (!presenzeAttese || presenzeAttese <= 0) return null;

  let mediaVotoUsata: number;
  let fonteMediaVoto: FonteMediaVoto;
  if (fpedia.presenze && fpedia.presenze >= SOGLIA_PRESENZE_AFFIDABILE && fpedia.mediaVoto) {
    mediaVotoUsata = fpedia.mediaVoto;
    fonteMediaVoto = "stagioneCorrente";
  } else if (fpedia.stagioniPrecedenti[0]?.mediaVoto) {
    mediaVotoUsata = fpedia.stagioniPrecedenti[0].mediaVoto;
    fonteMediaVoto = "stagionePrecedente";
  } else {
    mediaVotoUsata = contesto.medianaMediaVotoPerRuolo[player.ruolo] ?? 0;
    fonteMediaVoto = "medianaRuolo";
  }

  const golAttesi = puntoMedio(fpedia.golPrevisti) ?? 0;
  const assistAttesi = puntoMedio(fpedia.assistPrevisti) ?? 0;

  // Ammonizioni/espulsioni sono conteggi di stagione, non previsionali: si
  // proiettano scalandole per il rapporto tra presenze attese e presenze
  // gia' giocate (se ci sono presenze da cui scalare).
  const rateo = fpedia.presenze && fpedia.presenze > 0 ? presenzeAttese / fpedia.presenze : 1;
  const ammonizioniAttese = (fpedia.ammonizioni ?? 0) * rateo;
  const espulsioniAttese = (fpedia.espulsioni ?? 0) * rateo;

  const puntiMediaVoto = mediaVotoUsata * presenzeAttese;
  const puntiGol = golAttesi * (player.ruolo === "P" ? BONUS_GOL_PORTIERE : BONUS_GOL);
  const puntiAssist = assistAttesi * BONUS_ASSIST;
  const puntiMalus = -(ammonizioniAttese * MALUS_AMMONIZIONE + espulsioniAttese * MALUS_ESPULSIONE);

  const confidenza: ConfidenzaValoreAtteso =
    fonteMediaVoto === "stagioneCorrente" ? "alta" : fonteMediaVoto === "stagionePrecedente" ? "media" : "bassa";

  return {
    totale: puntiMediaVoto + puntiGol + puntiAssist + puntiMalus,
    puntiMediaVoto,
    puntiGol,
    puntiAssist,
    puntiMalus,
    presenzeAttese,
    fonteMediaVoto,
    confidenza,
  };
}

/**
 * Costruisce una funzione che valuta il livello relativo (super/.../negativo)
 * del valore atteso di un giocatore rispetto ai suoi pari: raggruppati per
 * ruolo Classic o per linea Mantra (Portieri/Difensori/Centrocampisti/
 * Attaccanti, non i 12 sotto-ruoli, per non spaccare troppo un campione che
 * a inizio asta e' spesso ancora piccolo). Il confronto include tutti i
 * giocatori con un valore atteso calcolabile, indipendentemente dallo stato
 * d'asta: "quanto e' forte" e' una domanda sul talento, non sulla
 * disponibilita' (quella la copre computeScarsitaRuoli).
 */
export function computeLivelloValoreAtteso(
  players: Player[],
  settings: Settings
): (player: Player) => LivelloFpedia {
  const contesto = computeContestoValoreAtteso(players);
  const isMantra = settings.modalita === "mantra";
  const valoriPerGruppo = new Map<string, number[]>();
  const valoreById = new Map<string, ValoreAtteso | null>();

  function chiaveGruppo(player: Player): string | undefined {
    if (!isMantra) return player.ruolo;
    const linea: LineaMantra | undefined = lineaMantraGiocatore(player.ruoliMantra);
    return linea;
  }

  for (const p of players) {
    const v = computeValoreAtteso(p, contesto);
    valoreById.set(p.id, v);
    if (v === null) continue;
    const chiave = chiaveGruppo(p);
    if (!chiave) continue;
    const arr = valoriPerGruppo.get(chiave);
    if (arr) arr.push(v.totale);
    else valoriPerGruppo.set(chiave, [v.totale]);
  }

  return (player) => {
    const v = valoreById.get(player.id) ?? computeValoreAtteso(player, contesto);
    if (!v) return null;
    const chiave = chiaveGruppo(player);
    if (!chiave) return null;
    const campione = valoriPerGruppo.get(chiave);
    if (!campione) return null;
    return livelloRelativoInCampione(v.totale, campione);
  };
}
