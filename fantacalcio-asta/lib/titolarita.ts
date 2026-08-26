import { Player } from "./types";

// ---------------------------------------------------------------------------
// Titolarita': quanto e' probabile che un giocatore scenda in campo, a
// prescindere da quanto vale (per il valore vedi ALG FCP, lib/fantasolidita.ts).
// Usata per il bordo colorato della foto in tabella.
// ---------------------------------------------------------------------------

/** Segnale di titolarita' dal trend testuale delle notizie (lib/matchNews.ts). */
const BONUS_TREND_POSITIVO = 8; // "Titolare fisso" / "In buona forma"
const MALUS_TREND_NEGATIVO = -10; // "In panchina" / "Squalificato" / "Infortunato" (testuale)
/** Segnale di titolarita' dal tag FPEDIA. */
const BONUS_TAG_TITOLARE = 4;
const MALUS_TAG_PANCHINARO = -6;

function haTag(p: Player, label: string): boolean {
  return (p.fpedia?.tags ?? []).some((t) => t.label.toLowerCase() === label.toLowerCase());
}

export function segnaleTrend(trendVoti: string | undefined): number {
  if (trendVoti === "Titolare fisso" || trendVoti === "In buona forma") return BONUS_TREND_POSITIVO;
  if (trendVoti === "In panchina" || trendVoti === "Squalificato" || trendVoti === "Infortunato") return MALUS_TREND_NEGATIVO;
  return 0;
}

export function segnaleTag(p: Player): number {
  let s = 0;
  if (haTag(p, "Titolare")) s += BONUS_TAG_TITOLARE;
  if (haTag(p, "Panchinaro")) s += MALUS_TAG_PANCHINARO;
  return s;
}

/**
 * Classificazione a 4 fasce della titolarita', da mostrare come bordo
 * colorato nella lista giocatori: riusa gli stessi segnali (trend notizie,
 * tag FPEDIA, flag infortunato) piu' le presenze previste.
 */
export type LivelloTitolarita = "alta" | "media" | "bassa" | "sconosciuta";

const SOGLIA_PRESENZE_ALTA = 24; // su un campionato di 38, circa 2 partite su 3
const SOGLIA_PRESENZE_MEDIA = 12; // circa 1 su 3: "buon numero" per un panchinaro

export function classificaTitolarita(player: Player): LivelloTitolarita {
  const segnale = segnaleTrend(player.trendVoti) + segnaleTag(player);
  const midPresenze = player.fpedia?.presenzePreviste
    ? (player.fpedia.presenzePreviste[0] + player.fpedia.presenzePreviste[1]) / 2
    : undefined;

  if (player.infortunato || player.trendVoti === "Squalificato") return "bassa";
  if (segnale > 0) return "alta";
  if (segnale < 0) return midPresenze !== undefined && midPresenze >= SOGLIA_PRESENZE_MEDIA ? "media" : "bassa";
  if (midPresenze === undefined) return "sconosciuta";
  if (midPresenze >= SOGLIA_PRESENZE_ALTA) return "alta";
  if (midPresenze >= SOGLIA_PRESENZE_MEDIA) return "media";
  return "bassa";
}

export const BORDO_TITOLARITA: Record<LivelloTitolarita, string> = {
  alta: "border-4 border-green-600",
  media: "border-4 border-yellow-400",
  bassa: "border-4 border-red-600",
  sconosciuta: "border-4 border-slate-300",
};

export function classeBordoTitolarita(player: Player): string {
  return BORDO_TITOLARITA[classificaTitolarita(player)];
}
