import { LivelloFpedia, Player } from "./types";
import { livelloRelativoInCampione } from "./percentile";

export type CampoFantasolidita = "algFcp" | "punteggioFcp" | "soliditaInvestimento" | "resistenzaInfortuni";

export const FANTASOLIDITA_CAMPI: CampoFantasolidita[] = [
  "algFcp",
  "punteggioFcp",
  "soliditaInvestimento",
  "resistenzaInfortuni",
];

export const FANTASOLIDITA_LABEL: Record<CampoFantasolidita, string> = {
  algFcp: "ALG FCP",
  punteggioFcp: "Punteggio FantaCalcioPedia",
  soliditaInvestimento: "Solidità Fantainvestimento",
  resistenzaInfortuni: "Resistenza infortuni",
};

export interface VoceFantasolidita {
  campo: CampoFantasolidita;
  label: string;
  valore: number;
}

/** Solo i campi effettivamente presenti per questo giocatore (0-100 ognuno). */
export function vociFantasolidita(player: Player): VoceFantasolidita[] {
  const fpedia = player.fpedia;
  if (!fpedia) return [];
  return FANTASOLIDITA_CAMPI.filter((c) => fpedia[c] !== undefined).map((c) => ({
    campo: c,
    label: FANTASOLIDITA_LABEL[c],
    valore: fpedia[c] as number,
  }));
}

/**
 * Livello relativo (5 fasce) di un valore di fantasolidità/rischio rispetto a
 * tutti gli altri giocatori del listino con lo stesso dato — stesso semaforo
 * usato per le pillole FPEDIA generiche (non i colori fissi del sito), per
 * restare coerenti col resto dell'app.
 */
export function computeLivelliFantasolidita(
  players: Player[]
): (player: Player, campo: CampoFantasolidita) => LivelloFpedia {
  const campioni = new Map<CampoFantasolidita, number[]>();
  for (const campo of FANTASOLIDITA_CAMPI) {
    campioni.set(
      campo,
      players.map((p) => p.fpedia?.[campo]).filter((v): v is number => v !== undefined)
    );
  }

  return (player, campo) => {
    const valore = player.fpedia?.[campo];
    if (valore === undefined) return null;
    return livelloRelativoInCampione(valore, campioni.get(campo) ?? []);
  };
}
