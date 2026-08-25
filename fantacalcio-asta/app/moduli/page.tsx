import { MODULI_MANTRA, SlotModulo } from "@/lib/moduliMantra";

const RUOLI_DIFESA = ["Por", "Dc", "Dd", "Ds", "B"];
const RUOLI_ATTACCO = ["A", "Pc"];

function coloreSlot(slot: SlotModulo): string {
  if (slot.every((r) => RUOLI_DIFESA.includes(r))) {
    return slot.includes("Por") ? "bg-amber-500" : "bg-sky-500";
  }
  if (slot.some((r) => RUOLI_ATTACCO.includes(r))) return "bg-pink-600";
  return "bg-blue-600";
}

function Badge({ slot }: { slot: SlotModulo }) {
  return (
    <span
      className={`${coloreSlot(slot)} text-white text-xs font-bold rounded px-2 py-1 shadow`}
      title={slot.join(" o ")}
    >
      {slot.join("/")}
    </span>
  );
}

function CampoModulo({ nome, slot, righe }: { nome: string; slot: SlotModulo[]; righe: number[][] }) {
  return (
    <div className="bg-slate-900 rounded-lg p-3">
      <h3 className="text-white text-center font-bold mb-2">{nome}</h3>
      <div className="bg-green-600 rounded relative border-2 border-white/30 py-4 px-2 space-y-4">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full border-2 border-white/20" />
        </div>
        {righe.map((riga, i) => (
          <div key={i} className="flex justify-center gap-3 relative">
            {riga.map((idx) => (
              <Badge key={idx} slot={slot[idx]} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ModuliPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Moduli Mantra</h1>
        <p className="text-slate-500 text-sm">
          Gli 11 moduli usati dalla dashboard per calcolare la copertura della rosa e i ruoli più
          richiesti (vedi pannello Budget in modalità Mantra). Ogni slot mostra i ruoli che possono
          occuparlo (es. &quot;W/A&quot; = ala o attaccante). Se un modulo non corrisponde al tuo
          schema, si corregge in <code className="bg-slate-100 px-1 rounded">lib/moduliMantra.ts</code>.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULI_MANTRA.map((modulo) => (
          <CampoModulo key={modulo.nome} nome={modulo.nome} slot={modulo.slot} righe={modulo.righe} />
        ))}
      </div>
    </div>
  );
}
