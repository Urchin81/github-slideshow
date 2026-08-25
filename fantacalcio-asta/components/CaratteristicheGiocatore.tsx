import { Player } from "@/lib/types";

interface Caratteristica {
  chiave: string;
  icona: string;
  label: string;
  positiva: boolean;
  presente: (p: Player) => boolean;
}

// I tag possono ancora arrivare nel vecchio formato (string[]) da dati salvati
// nel browser prima che diventassero {label, livello}: gestiamo entrambi.
function etichettaTag(t: unknown): string | undefined {
  if (typeof t === "string") return t;
  if (t && typeof t === "object" && typeof (t as { label?: unknown }).label === "string") {
    return (t as { label: string }).label;
  }
  return undefined;
}

function haTag(p: Player, label: string): boolean {
  return (p.fpedia?.tags ?? []).some((t) => etichettaTag(t)?.toLowerCase() === label.toLowerCase());
}

// Icone rapide per riconoscere a colpo d'occhio le caratteristiche di un giocatore:
// verdi quelle positive (dedotte dalle notizie o dai tag FPEDIA), rosse quelle negative.
const CARATTERISTICHE: Caratteristica[] = [
  { chiave: "rigorista", icona: "🎯", label: "Rigorista", positiva: true, presente: (p) => !!p.rigorista || haTag(p, "Rigorista") },
  { chiave: "punizioni", icona: "🦵", label: "Tiratore punizioni", positiva: true, presente: (p) => !!p.tiratorePunizioni },
  { chiave: "angoli", icona: "🚩", label: "Tiratore angoli", positiva: true, presente: (p) => !!p.tiratoreAngoli },
  { chiave: "titolare", icona: "⭐", label: "Titolare", positiva: true, presente: (p) => haTag(p, "Titolare") },
  { chiave: "goleador", icona: "⚽", label: "Goleador", positiva: true, presente: (p) => haTag(p, "Goleador") },
  { chiave: "assistman", icona: "🅰️", label: "Assistman", positiva: true, presente: (p) => haTag(p, "Assistman") },
  { chiave: "buonaMedia", icona: "📈", label: "Buona media", positiva: true, presente: (p) => haTag(p, "Buona Media") },
  { chiave: "piazzati", icona: "🥇", label: "Piazzati", positiva: true, presente: (p) => haTag(p, "Piazzati") },
  { chiave: "outsider", icona: "🎁", label: "Outsider", positiva: true, presente: (p) => haTag(p, "Outsider") },
  { chiave: "giovaneTalento", icona: "🌱", label: "Giovane talento", positiva: true, presente: (p) => haTag(p, "Giovane talento") },
  { chiave: "panchinaro", icona: "🪑", label: "Panchinaro", positiva: false, presente: (p) => haTag(p, "Panchinaro") },
  { chiave: "falloso", icona: "🟨", label: "Falloso", positiva: false, presente: (p) => haTag(p, "Falloso") },
  {
    chiave: "rischioInfortuni",
    icona: "🚑",
    label: "Rischio infortuni",
    positiva: false,
    presente: (p) => (p.fpedia?.resistenzaInfortuni ?? 5) <= 2,
  },
];

export function CaratteristicheGiocatore({ player, className = "" }: { player: Player; className?: string }) {
  const presenti = CARATTERISTICHE.filter((c) => c.presente(player));
  if (presenti.length === 0) return null;
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {presenti.map((c) => (
        // L'emoji resta a colori nativi: il verde/rosso richiesto lo porta lo sfondo
        // del cerchietto, cosi' il segnale positivo/negativo si vede comunque a colpo d'occhio.
        <span
          key={c.chiave}
          title={c.label}
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] leading-none ${
            c.positiva ? "bg-green-100" : "bg-red-100"
          }`}
        >
          {c.icona}
        </span>
      ))}
    </div>
  );
}
