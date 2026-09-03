import { LivelloFpedia } from "@/lib/types";
import { classeLivello } from "@/lib/livelloColori";

/**
 * Una barra percentuale (0-100) per una singola metrica di fantasolidità/
 * rischi, colorata col semaforo relativo a 5 fasce già usato per le altre
 * pillole FPEDIA. `compatta` la riduce a etichetta+barra sottile+percentuale
 * su un'unica riga, per stare dentro una cella di tabella.
 */
export function BarraFantasolidita({
  label,
  valore,
  livello,
  compatta = false,
}: {
  label: string;
  valore: number;
  livello: LivelloFpedia;
  compatta?: boolean;
}) {
  const percentuale = Math.min(100, Math.max(0, valore));

  if (compatta) {
    return (
      <div className="flex items-center gap-1" title={`${label}: ${Math.round(valore)}%`}>
        <span className="w-16 shrink-0 text-[8px] uppercase text-slate-400 truncate">{label}</span>
        <span className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <span className={`block h-full rounded-full ${classeLivello(livello)}`} style={{ width: `${percentuale}%` }} />
        </span>
        <span className="w-7 shrink-0 text-right text-[9px] text-slate-400">{Math.round(valore)}%</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-0.5">
        <span>{label}</span>
        <span className="font-semibold text-slate-700">{Math.round(valore)}%</span>
      </div>
      <span className="block bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <span className={`block h-full rounded-full ${classeLivello(livello)}`} style={{ width: `${percentuale}%` }} />
      </span>
    </div>
  );
}
