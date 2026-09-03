import { LivelloFpedia } from "./types";

// Semaforo a 5 colori condiviso da qualunque metrica comparativa (pillole
// FPEDIA in lib/suggestions.ts, fantasolidità/rischi in lib/fantasolidita.ts):
// estratto qui, invece che in uno dei moduli che lo usano, per evitare un
// import circolare tra loro.
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
 * Rango (midrank, 0..1) di un valore rispetto a un campione: 1 = il migliore
 * del campione, 0 = il peggiore. Chi chiama deve gia' aver verificato che il
 * campione sia abbastanza grande (vedi minimoCampione nelle due funzioni
 * sotto, che sono le uniche chiamanti) — qui sotto non c'e' quel controllo.
 */
function percentileInCampione(valore: number, campione: number[]): number {
  let sotto = 0;
  let uguali = 0;
  for (const v of campione) {
    if (v < valore) sotto++;
    else if (v === valore) uguali++;
  }
  return (sotto + (uguali - 1) / 2) / (campione.length - 1);
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
  return livelloDaPercentile(percentileInCampione(valore, campione));
}

/**
 * Come livelloRelativoInCampione, ma come numero continuo 0-100 (100 = il
 * migliore del campione) invece che a 5 fasce — per indicatori dove serve un
 * valore sempre confrontabile, non solo un colore (es. Urgenza in
 * lib/urgenza.ts).
 */
export function percentualeRelativaInCampione(
  valore: number,
  campione: number[],
  minimoCampione = 3
): number | null {
  if (campione.length < minimoCampione) return null;
  return Math.round(percentileInCampione(valore, campione) * 100);
}
