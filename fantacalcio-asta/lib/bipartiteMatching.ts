import { RuoloMantra } from "./types";
import { SlotModulo } from "./moduliMantra";

function slotAccetta(slot: SlotModulo, ruoli: RuoloMantra[]): boolean {
  return slot.some((r) => ruoli.includes(r));
}

/** Algoritmo di Kuhn (ricerca di cammini aumentanti) per il matching massimo bipartito slot<->giocatori. */
function tryAssign(
  playerId: string,
  slots: SlotModulo[],
  candidati: Map<string, RuoloMantra[]>,
  assegnazioni: (string | undefined)[],
  visited: Set<number>
): boolean {
  const ruoli = candidati.get(playerId);
  if (!ruoli) return false;

  for (let s = 0; s < slots.length; s++) {
    if (visited.has(s) || !slotAccetta(slots[s], ruoli)) continue;
    visited.add(s);
    const occupante = assegnazioni[s];
    if (occupante === undefined || tryAssign(occupante, slots, candidati, assegnazioni, visited)) {
      assegnazioni[s] = playerId;
      return true;
    }
  }
  return false;
}

/**
 * Calcola quanti slot di un modulo si riescono a coprire con una rosa di
 * giocatori multi-ruolo, tenendo lo stato per poter testare in modo
 * incrementale ("proveresti") se un nuovo giocatore aumenterebbe la copertura,
 * senza dover ripetere il matching completo ad ogni candidato.
 */
export class MatchmakerModulo {
  private slots: SlotModulo[];
  private assegnazioni: (string | undefined)[];
  private candidati: Map<string, RuoloMantra[]> = new Map();

  constructor(slots: SlotModulo[]) {
    this.slots = slots;
    this.assegnazioni = new Array(slots.length).fill(undefined);
  }

  /** Aggiunge un giocatore alla rosa e ritorna true se ha coperto un nuovo slot. */
  aggiungi(playerId: string, ruoli: RuoloMantra[]): boolean {
    this.candidati.set(playerId, ruoli);
    return tryAssign(playerId, this.slots, this.candidati, this.assegnazioni, new Set());
  }

  /** Come aggiungi(), ma senza modificare lo stato: per il valore marginale di un candidato. */
  proveresti(playerId: string, ruoli: RuoloMantra[]): boolean {
    const assegnazioniClone = [...this.assegnazioni];
    const candidatiClone = new Map(this.candidati);
    candidatiClone.set(playerId, ruoli);
    return tryAssign(playerId, this.slots, candidatiClone, assegnazioniClone, new Set());
  }

  get coperti(): number {
    return this.assegnazioni.filter((a) => a !== undefined).length;
  }

  get totale(): number {
    return this.slots.length;
  }

  slotScoperti(): SlotModulo[] {
    return this.slots.filter((_, i) => this.assegnazioni[i] === undefined);
  }
}

export function costruisciMatchmaker(
  slots: SlotModulo[],
  giocatori: { id: string; ruoli: RuoloMantra[] }[]
): MatchmakerModulo {
  const matchmaker = new MatchmakerModulo(slots);
  for (const g of giocatori) matchmaker.aggiungi(g.id, g.ruoli);
  return matchmaker;
}
