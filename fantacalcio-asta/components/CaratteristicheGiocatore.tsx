import {
  Armchair,
  Award,
  Bandage,
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

export interface Caratteristica {
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
// Esportato cosi' la tabella puo' riusare le stesse definizioni per filtrare la lista
// quando si clicca su un'icona.
export const CARATTERISTICHE: Caratteristica[] = [
  { chiave: "infortunato", Icona: Bandage, label: "Infortunato", positiva: false, presente: (p) => !!p.infortunato },
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
    presente: (p) => (p.fpedia?.resistenzaInfortuni ?? 100) <= 40,
  },
];

interface Props {
  player: Player;
  className?: string;
  caratteristicaAttiva?: string | null;
  onSelezionaCaratteristica?: (chiave: string) => void;
  /** Solo le caratteristiche presenti, con etichetta testuale visibile invece del solo tooltip (per il box "in asta", che ha spazio). */
  soloPresenti?: boolean;
}

export function CaratteristicheGiocatore({
  player,
  className = "",
  caratteristicaAttiva = null,
  onSelezionaCaratteristica,
  soloPresenti = false,
}: Props) {
  const voci = soloPresenti ? CARATTERISTICHE.filter((c) => c.presente(player)) : CARATTERISTICHE;

  if (soloPresenti && voci.length === 0) {
    return <div className={`text-xs text-slate-400 ${className}`}>Nessuna caratteristica rilevata</div>;
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {voci.map((c) => {
        const attiva = c.presente(player);
        const selezionata = caratteristicaAttiva === c.chiave;
        const colore = attiva ? (c.positiva ? "text-green-600" : "text-red-600") : "text-slate-400";
        const icona = <c.Icona aria-label={c.label} size={14} strokeWidth={2} className={colore} />;
        const contenuto = soloPresenti ? (
          <span className="inline-flex items-center gap-1">
            {icona}
            <span className={`text-xs ${colore}`}>{c.label}</span>
          </span>
        ) : (
          icona
        );
        if (!onSelezionaCaratteristica) {
          return (
            <span key={c.chiave} title={c.label} className="inline-flex">
              {contenuto}
            </span>
          );
        }
        return (
          <button
            key={c.chiave}
            type="button"
            title={`Filtra per "${c.label}"`}
            onClick={() => onSelezionaCaratteristica(c.chiave)}
            className={`inline-flex rounded-full p-0.5 ${
              selezionata ? "bg-white ring-2 ring-slate-900" : "hover:bg-white/70"
            }`}
          >
            {contenuto}
          </button>
        );
      })}
    </div>
  );
}
