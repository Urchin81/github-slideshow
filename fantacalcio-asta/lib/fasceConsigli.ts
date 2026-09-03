import { LivelloFpedia } from "./types";

/**
 * Ordine delle fasce di valutazione dalla migliore alla peggiore. Il documento sorgente elenca
 * le fasce già ordinate dalla più forte alla più debole, separatamente per ogni ruolo (Portieri,
 * Difensori, Centrocampisti, Attaccanti): qui le sequenze dei 4 ruoli sono unificate in un'unica
 * scala (i ruoli con meno fasce, es. i portieri, semplicemente non toccano quelle mancanti).
 * Usata per un eventuale ordinamento e per la codifica a colori qui sotto.
 */
export const FASCE_CONSIGLI = [
  "Super Top",
  "Top",
  "Semitop",
  "Sotto ai semitop",
  "Fascia alta",
  "Jolly 1ª fascia",
  "Possibile sorpresa",
  "Fascia media",
  "Infortunati",
  "Scommessa",
  "Sopra ai low cost",
  "Jolly 2ª fascia",
  "Low cost 1ª fascia",
  "Low cost 2ª fascia",
  "Leghe numerose",
  "Jolly 3ª fascia",
  "Jolly 4ª fascia",
  "A rischio",
  "Da evitare",
  "Mercato",
] as const;

/** Indice della fascia nella scala sopra (0 = migliore); una fascia non riconosciuta va in fondo. */
export function ordineFasciaConsigli(fascia: string): number {
  const idx = (FASCE_CONSIGLI as readonly string[]).indexOf(fascia);
  return idx === -1 ? FASCE_CONSIGLI.length : idx;
}

// Stesso semaforo a 5 colori di LivelloFpedia, per dare un colpo d'occhio immediato sulle 20
// fasce senza dover ricordare l'ordine esatto della scala sopra.
const LIVELLO_PER_FASCIA: Record<string, LivelloFpedia> = {
  "Super Top": "super",
  Top: "super",
  Semitop: "buono",
  "Sotto ai semitop": "buono",
  "Fascia alta": "buono",
  "Jolly 1ª fascia": "buono",
  "Possibile sorpresa": "sufficiente",
  "Fascia media": "sufficiente",
  "Sopra ai low cost": "sufficiente",
  "Jolly 2ª fascia": "sufficiente",
  "Low cost 1ª fascia": "sufficiente",
  Infortunati: "mediocre",
  Scommessa: "mediocre",
  "Low cost 2ª fascia": "mediocre",
  "Leghe numerose": "mediocre",
  "Jolly 3ª fascia": "mediocre",
  "Jolly 4ª fascia": "mediocre",
  "A rischio": "negativo",
  "Da evitare": "negativo",
  Mercato: "negativo",
};

export function livelloFasciaConsigli(fascia: string): LivelloFpedia {
  return LIVELLO_PER_FASCIA[fascia] ?? null;
}
