import { RuoloMantra } from "./types";

/** Un singolo slot in campo: elenco di ruoli Mantra che possono occuparlo (es. Dc/B). */
export type SlotModulo = RuoloMantra[];

export interface Modulo {
  nome: string;
  /** Tutti gli slot del modulo, portiere incluso, nell'ordine portiere -> difesa -> centrocampo -> attacco. */
  slot: SlotModulo[];
}

/**
 * Moduli Mantra "Edizione 2026/2027" trascritti dallo schema fornito
 * dall'utente. Trascrizione a mano da un'immagine: i moduli piu' densi (3-5-2,
 * 3-5-1-1, 4-1-4-1, 4-4-1-1, 4-2-3-1) potrebbero contenere qualche imprecisione
 * nei ruoli esatti di 1-2 slot. Se noti un modulo che non corrisponde al tuo
 * schema, correggi pure l'array `slot` qui sotto: e' l'unico posto da modificare.
 */
export const MODULI_MANTRA: Modulo[] = [
  {
    nome: "3-4-3",
    slot: [
      ["Por"],
      ["Dc"], ["Dc"], ["Dc", "B"],
      ["E"], ["M", "C"], ["C"],
      ["W", "A"], ["W", "A"],
      ["A", "Pc"],
    ],
  },
  {
    nome: "3-4-1-2",
    slot: [
      ["Por"],
      ["Dc"], ["Dc"], ["Dc", "B"],
      ["E"], ["M", "C"], ["C"],
      ["T"],
      ["A", "Pc"], ["A", "Pc"],
    ],
  },
  {
    nome: "3-4-2-1",
    slot: [
      ["Por"],
      ["Dc"], ["Dc"], ["Dc", "B"],
      ["M"], ["C"], ["E"],
      ["T", "A"], ["T", "A"],
      ["A", "Pc"],
    ],
  },
  {
    nome: "3-5-2",
    slot: [
      ["Por"],
      ["Dc"], ["Dc"], ["Dc", "B"],
      ["E"], ["M", "C"], ["M"], ["C"], ["E"],
      ["A", "Pc"], ["A", "Pc"],
    ],
  },
  {
    nome: "3-5-1-1",
    slot: [
      ["Por"],
      ["Dc"], ["Dc"], ["Dc", "B"],
      ["E"], ["M", "C"], ["M"], ["C"], ["E"],
      ["T", "A"],
      ["A", "Pc"],
    ],
  },
  {
    nome: "4-3-3",
    slot: [
      ["Por"],
      ["Dd"], ["Dc"], ["Dc"], ["Ds"],
      ["M", "C"], ["M"], ["C"],
      ["W", "A"], ["W", "A"],
      ["A", "Pc"],
    ],
  },
  {
    nome: "4-3-1-2",
    slot: [
      ["Por"],
      ["Dd"], ["Dc"], ["Dc"], ["Ds"],
      ["M", "C"], ["M"], ["C"],
      ["T"],
      ["A", "Pc"], ["A", "Pc"],
    ],
  },
  {
    nome: "4-4-2",
    slot: [
      ["Por"],
      ["Dd"], ["Dc"], ["Dc"], ["Ds"],
      ["E"], ["M", "C"], ["C"], ["E"],
      ["A", "Pc"], ["A", "Pc"],
    ],
  },
  {
    nome: "4-1-4-1",
    slot: [
      ["Por"],
      ["Dd"], ["Dc"], ["Dc"], ["Ds"],
      ["M"],
      ["E"], ["C", "T"], ["C", "T"], ["W"],
      ["A", "Pc"],
    ],
  },
  {
    nome: "4-4-1-1",
    slot: [
      ["Por"],
      ["Dd"], ["Dc"], ["Dc"], ["Ds"],
      ["E"], ["M", "C"], ["C"], ["W"],
      ["T", "A"],
      ["A", "Pc"],
    ],
  },
  {
    nome: "4-2-3-1",
    slot: [
      ["Por"],
      ["Dd"], ["Dc"], ["Dc"], ["Ds"],
      ["M"], ["M", "C"],
      ["W", "T"], ["T"], ["W", "A"],
      ["A", "Pc"],
    ],
  },
];
