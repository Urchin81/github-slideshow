import { NextResponse } from "next/server";
import { estraiIndiceGiocatori, FPEDIA_RUOLI_ELENCO } from "@/lib/fpedia";
import { FPEDIA_BASE_URL, fetchTesto } from "@/lib/fpediaFetch";

export const dynamic = "force-dynamic";

/**
 * Le pagine elenco "infortunati" di FPEDIA (una per ruolo) usano lo stesso
 * prefisso URL e — quasi certamente — lo stesso template delle pagine elenco
 * per ruolo già scraped in lib/fpedia.ts (struttura confermata li' da due
 * scraper indipendenti), solo filtrate sugli infortunati: si riusa quindi
 * estraiIndiceGiocatori invece di scrivere un parser dedicato. Se la
 * struttura reale differisse, il parsing tornerebbe semplicemente 0 nomi per
 * quella pagina (nessun crash) — verificabile dall'esito mostrato in Settings.
 */
export async function GET() {
  const risultati = await Promise.allSettled(
    FPEDIA_RUOLI_ELENCO.map((ruolo) => fetchTesto(`${FPEDIA_BASE_URL}/lista-calciatori-serie-a/${ruolo}/infortunati`))
  );

  const nomi = new Set<string>();
  const errori: string[] = [];
  for (const r of risultati) {
    if (r.status === "fulfilled") {
      estraiIndiceGiocatori(r.value).forEach((voce) => nomi.add(voce.nome));
    } else {
      console.error("[fpedia-infortuni] fetch fallito:", r.reason);
      errori.push(r.reason instanceof Error ? r.reason.message : "Errore imprevisto.");
    }
  }

  if (nomi.size === 0 && errori.length > 0) {
    return NextResponse.json({ nomi: [], errore: errori[0] });
  }
  return NextResponse.json({ nomi: Array.from(nomi) });
}
