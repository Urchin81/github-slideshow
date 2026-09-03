import { LivelloFpedia } from "./types";

// Semaforo a 5 colori condiviso da ogni pillola/badge percentile dell'app
// (statistiche FPEDIA e fantasolidità/rischi nella scheda giocatore e in
// tabella): un livello non calcolabile (troppo pochi altri giocatori da
// confrontare) resta grigio neutro, non lo forziamo in una categoria a caso.
export const COLORE_LIVELLO: Record<Exclude<LivelloFpedia, null>, string> = {
  super: "bg-sky-500 text-white",
  buono: "bg-green-600 text-white",
  sufficiente: "bg-yellow-400 text-slate-900",
  mediocre: "bg-orange-500 text-white",
  negativo: "bg-red-800 text-white",
};

export const LEGENDA_LIVELLI: { livello: Exclude<LivelloFpedia, null>; label: string }[] = [
  { livello: "super", label: "Super" },
  { livello: "buono", label: "Buono" },
  { livello: "sufficiente", label: "Sufficiente" },
  { livello: "mediocre", label: "Mediocre" },
  { livello: "negativo", label: "Negativo" },
];

export function classeLivello(livello: LivelloFpedia): string {
  return livello ? COLORE_LIVELLO[livello] : "bg-slate-200 text-slate-600";
}
