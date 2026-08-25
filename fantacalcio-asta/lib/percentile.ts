import { LivelloFpedia } from "./types";

// Semaforo a 5 colori condiviso da qualunque metrica comparativa (pillole
// FPEDIA in lib/suggestions.ts, valore atteso fantacalcistico in
// lib/valoreAtteso.ts): estratto qui, invece che in uno dei due, per evitare
// un import circolare tra i due moduli.
const SOGLIE_PERCENTILE: [number, LivelloFpedia][] = [
  [0.8, "super"],
  [0.6, "buono"],
  [0.4, "sufficiente"],
  [0.2, "mediocre"],
];

function livelloDaPercentile(percentile: number): LivelloFpedia {
  for (const [soglia, livello] of SOGLIE_PERCENTILE) {
    if (percentile >= soglia) return livello;
  }
  return "negativo";
}

/**
 * Livello relativo (super/buono/.../negativo) di un valore rispetto a un
 * campione di altri valori dello stesso tipo. Se il campione e' troppo
 * piccolo per un confronto significativo, restituisce null (grigio neutro)
 * invece di un giudizio poco affidabile.
 */
export function livelloRelativoInCampione(
  valore: number,
  campione: number[],
  minimoCampione = 3
): LivelloFpedia {
  if (campione.length < minimoCampione) return null;
  let sotto = 0;
  let uguali = 0;
  for (const v of campione) {
    if (v < valore) sotto++;
    else if (v === valore) uguali++;
  }
  const percentile = (sotto + (uguali - 1) / 2) / (campione.length - 1);
  return livelloDaPercentile(percentile);
}
