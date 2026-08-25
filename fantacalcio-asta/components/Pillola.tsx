import { LivelloFpedia } from "@/lib/types";
import { classeLivello } from "@/lib/livelloColori";

export function Pillola({ label, valore, livello }: { label: string; valore: string; livello: LivelloFpedia }) {
  return (
    <div className="flex flex-col items-center text-center gap-1.5">
      <span
        className={`inline-flex items-center justify-center min-w-[3.5rem] px-2.5 py-2 rounded-full text-sm font-bold ${classeLivello(livello)}`}
      >
        {valore}
      </span>
      <span className="text-[10px] uppercase text-slate-400 tracking-wide leading-tight">{label}</span>
    </div>
  );
}
