import { MODULI_MANTRA, SlotModulo } from "@/lib/moduliMantra";
import { RUOLO_MANTRA_COLORE } from "@/lib/types";

const RUOLI_DIFESA = ["Por", "Dc", "Dd", "Ds", "B"];
const RUOLI_TREQUARTISTI_ALI = ["T", "W"];
const RUOLI_ATTACCO = ["A", "Pc"];

// Uno slot elenca ruoli alternativi per lo stesso posto in campo: il colore
// dell'etichetta segue la stessa mappa usata per i singoli ruoli altrove
// nell'app (rosa, tabella, scheda giocatore), con questa priorita' quando lo
// slot mescola ruoli di categorie diverse (es. "W/A" resta viola, non rosso).
function coloreSlot(slot: SlotModulo): string {
  if (slot.every((r) => RUOLI_DIFESA.includes(r))) {
    return slot.includes("Por") ? RUOLO_MANTRA_COLORE.Por : RUOLO_MANTRA_COLORE.Dc;
  }
  if (slot.some((r) => RUOLI_TREQUARTISTI_ALI.includes(r))) return RUOLO_MANTRA_COLORE.T;
  if (slot.some((r) => RUOLI_ATTACCO.includes(r))) return RUOLO_MANTRA_COLORE.A;
  return RUOLO_MANTRA_COLORE.E;
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
