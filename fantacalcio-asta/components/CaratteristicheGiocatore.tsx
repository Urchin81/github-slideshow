import {
  Armchair,
  Award,
  CircleAlert,
  Flag,
  Footprints,
  Gift,
  Goal,
  HeartPulse,
  Send,
  Sprout,
  Star,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Player } from "@/lib/types";

interface Caratteristica {
  chiave: string;
  Icona: LucideIcon;
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
  { chiave: "rigorista", Icona: Target, label: "Rigorista", positiva: true, presente: (p) => !!p.rigorista || haTag(p, "Rigorista") },
  { chiave: "punizioni", Icona: Footprints, label: "Tiratore punizioni", positiva: true, presente: (p) => !!p.tiratorePunizioni },
  { chiave: "angoli", Icona: Flag, label: "Tiratore angoli", positiva: true, presente: (p) => !!p.tiratoreAngoli },
  { chiave: "titolare", Icona: Star, label: "Titolare", positiva: true, presente: (p) => haTag(p, "Titolare") },
  { chiave: "goleador", Icona: Goal, label: "Goleador", positiva: true, presente: (p) => haTag(p, "Goleador") },
  { chiave: "assistman", Icona: Send, label: "Assistman", positiva: true, presente: (p) => haTag(p, "Assistman") },
  { chiave: "buonaMedia", Icona: TrendingUp, label: "Buona media", positiva: true, presente: (p) => haTag(p, "Buona Media") },
  { chiave: "piazzati", Icona: Award, label: "Piazzati", positiva: true, presente: (p) => haTag(p, "Piazzati") },
  { chiave: "outsider", Icona: Gift, label: "Outsider", positiva: true, presente: (p) => haTag(p, "Outsider") },
  { chiave: "giovaneTalento", Icona: Sprout, label: "Giovane talento", positiva: true, presente: (p) => haTag(p, "Giovane talento") },
  { chiave: "panchinaro", Icona: Armchair, label: "Panchinaro", positiva: false, presente: (p) => haTag(p, "Panchinaro") },
  { chiave: "falloso", Icona: CircleAlert, label: "Falloso", positiva: false, presente: (p) => haTag(p, "Falloso") },
  {
    chiave: "rischioInfortuni",
    Icona: HeartPulse,
    label: "Rischio infortuni",
    positiva: false,
    presente: (p) => (p.fpedia?.resistenzaInfortuni ?? 5) <= 2,
  },
];

export function CaratteristicheGiocatore({ player, className = "" }: { player: Player; className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {CARATTERISTICHE.map((c) => {
        const attiva = c.presente(player);
        const colore = attiva ? (c.positiva ? "text-green-600" : "text-red-600") : "text-slate-400";
        return (
          <span key={c.chiave} title={c.label} className="inline-flex">
            <c.Icona aria-label={c.label} size={14} strokeWidth={2} className={colore} />
          </span>
        );
      })}
    </div>
  );
}
