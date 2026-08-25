import { RuoloMantra } from "./types";

/** Un singolo slot in campo: elenco di ruoli Mantra che possono occuparlo (es. Dc/B). */
export type SlotModulo = RuoloMantra[];

export interface Modulo {
  nome: string;
  /** Tutti gli slot del modulo, portiere incluso, nell'ordine portiere -> difesa -> centrocampo -> attacco. */
  slot: SlotModulo[];
  /** Indici di `slot` raggruppati in righe (dal portiere in alto all'attacco in basso), solo per il disegno del campo. */
  righe: number[][];
}

/**
 * Moduli Mantra "Edizione 2026/2027" trascritti dallo schema fornito
 * dall'utente. Ogni modulo somma esattamente 11 slot (portiere incluso),
 * coerenti con il nome (es. 4-2-3-1 = 4 difensori + 2 mediani + 3 trequartisti
 * /ali + 1 punta). Se un modulo non corrisponde esattamente al tuo schema,
 * correggi pure l'array `slot`/`righe` qui sotto: e' l'unico posto da
 * modificare, sia per l'algoritmo che per il disegno del campo in /moduli.
 */
export const MODULI_MANTRA: Modulo[] = [
  {
    nome: "3-4-3",
    slot: [
      ["Por"],
      ["Dc"], ["Dc"], ["Dc", "B"],
      ["E"], ["M", "C"], ["C"], ["E"],
      ["W", "A"], ["W", "A"],
      ["A", "Pc"],
    ],
    righe: [[0], [1, 2, 3], [4, 5, 6, 7], [8, 9], [10]],
  },
  {
    nome: "3-4-1-2",
    slot: [
      ["Por"],
      ["Dc"], ["Dc"], ["Dc", "B"],
      ["E"], ["M", "C"], ["C"], ["E"],
      ["T"],
      ["A", "Pc"], ["A", "Pc"],
    ],
    righe: [[0], [1, 2, 3], [4, 5, 6, 7], [8], [9, 10]],
  },
  {
    nome: "3-4-2-1",
    slot: [
      ["Por"],
      ["Dc"], ["Dc"], ["Dc", "B"],
      ["E"], ["M", "C"], ["C"], ["E"],
      ["T", "A"], ["T", "A"],
      ["A", "Pc"],
    ],
    righe: [[0], [1, 2, 3], [4, 5, 6, 7], [8, 9], [10]],
  },
  {
    nome: "3-5-2",
    slot: [
      ["Por"],
      ["Dc"], ["Dc"], ["Dc", "B"],
      ["E", "W"], ["M"], ["M"], ["C"], ["E", "W"],
      ["A", "Pc"], ["A", "Pc"],
    ],
    righe: [[0], [1, 2, 3], [4, 5, 6, 7, 8], [9, 10]],
  },
  {
    nome: "3-5-1-1",
    slot: [
      ["Por"],
      ["Dc"], ["Dc"], ["Dc", "B"],
      ["E", "W"], ["M"], ["M"], ["C"], ["E", "W"],
      ["T", "A"],
      ["A", "Pc"],
    ],
    righe: [[0], [1, 2, 3], [4, 5, 6, 7, 8], [9], [10]],
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
    righe: [[0], [1, 2, 3, 4], [5, 6, 7], [8, 9], [10]],
  },
  {
    nome: "4-3-1-2",
    slot: [
      ["Por"],
      ["Dd"], ["Dc"], ["Dc"], ["Ds"],
      ["M", "C"], ["M"], ["C"],
      ["T"],
      ["T", "A", "Pc"], ["A", "Pc"],
    ],
    righe: [[0], [1, 2, 3, 4], [5, 6, 7], [8], [9, 10]],
  },
  {
    nome: "4-4-2",
    slot: [
      ["Por"],
      ["Dd"], ["Dc"], ["Dc"], ["Ds"],
      ["E"], ["M", "C"], ["C"], ["E"],
      ["A", "Pc"], ["A", "Pc"],
    ],
    righe: [[0], [1, 2, 3, 4], [5, 6, 7, 8], [9, 10]],
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
    righe: [[0], [1, 2, 3, 4], [5], [6, 7, 8, 9], [10]],
  },
  {
    nome: "4-4-1-1",
    slot: [
      ["Por"],
      ["Dd"], ["Dc"], ["Dc"], ["Ds"],
      ["E"], ["M", "C"], ["C"], ["E", "W"],
      ["T", "A"],
      ["A", "Pc"],
    ],
    righe: [[0], [1, 2, 3, 4], [5, 6, 7, 8], [9], [10]],
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
    righe: [[0], [1, 2, 3, 4], [5, 6], [7, 8, 9], [10]],
  },
];
