import { LineaMantra, LivelloFpedia, Player, Settings, lineaMantraGiocatore } from "./types";
import { livelloRelativoInCampione } from "./percentile";

// ---------------------------------------------------------------------------
// Valore atteso fantacalcistico: usa deliberatamente gli score proprietari di
// FPEDIA (Algoritmo FCP e Punteggio FantaCalcioPedia, entrambi 0-100), non un
// calcolo fatto in casa — sono già la sintesi di un modello previsionale che
// non abbiamo modo di replicare meglio da qui, e mostrarli cosi' come sono
// (con un'icona che li marca esplicitamente come "previsione esterna", vedi
// Pillola in app/giocatore/[id]/page.tsx) e' piu' onesto che vestirli da
// calcolo nostro.
// ---------------------------------------------------------------------------

export interface ValoreAtteso {
  /** Media di algFcp e punteggioFcp (quelli disponibili: se manca uno dei due si usa solo l'altro). */
  totale: number;
  algFcp?: number;
  punteggioFcp?: number;
}

/**
 * Valore atteso di un giocatore. Restituisce null se non ci sono dati FPEDIA
 * o se ne' algFcp ne' punteggioFcp sono disponibili.
 */
export function computeValoreAtteso(player: Player): ValoreAtteso | null {
  const fpedia = player.fpedia;
  if (!fpedia) return null;
  const { algFcp, punteggioFcp } = fpedia;
  if (algFcp === undefined && punteggioFcp === undefined) return null;

  const valori = [algFcp, punteggioFcp].filter((v): v is number => v !== undefined);
  const totale = valori.reduce((sum, v) => sum + v, 0) / valori.length;

  return { totale, algFcp, punteggioFcp };
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
  const isMantra = settings.modalita === "mantra";
  const valoriPerGruppo = new Map<string, number[]>();
  const valoreById = new Map<string, ValoreAtteso | null>();

  function chiaveGruppo(player: Player): string | undefined {
    if (!isMantra) return player.ruolo;
    const linea: LineaMantra | undefined = lineaMantraGiocatore(player.ruoliMantra);
    return linea;
  }

  for (const p of players) {
    const v = computeValoreAtteso(p);
    valoreById.set(p.id, v);
    if (v === null) continue;
    const chiave = chiaveGruppo(p);
    if (!chiave) continue;
    const arr = valoriPerGruppo.get(chiave);
    if (arr) arr.push(v.totale);
    else valoriPerGruppo.set(chiave, [v.totale]);
  }

  return (player) => {
    const v = valoreById.get(player.id) ?? computeValoreAtteso(player);
    if (!v) return null;
    const chiave = chiaveGruppo(player);
    if (!chiave) return null;
    const campione = valoriPerGruppo.get(chiave);
    if (!campione) return null;
    return livelloRelativoInCampione(v.totale, campione);
  };
}
