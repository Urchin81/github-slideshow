import { NextResponse } from "next/server";
import { parseFpediaGuidaAsta } from "@/lib/fpediaBallottaggi";
import { FPEDIA_BASE_URL, fetchTesto } from "@/lib/fpediaFetch";

export const dynamic = "force-dynamic";

/**
 * Pagina guida-asta di FPEDIA: un'unica pagina con tutte le squadre di Serie A (ogni
 * squadra come ancora "#slug", es. "#inter") — una sola richiesta basta, a differenza
 * di /api/fpedia-infortuni che ne fa una per ruolo. Struttura confermata su un campione
 * HTML reale (lib/__fixtures__/fpedia-guida-asta-sample.html, vedi lib/fpediaBallottaggi.ts).
 */
const URL_GUIDA_ASTA = `${FPEDIA_BASE_URL}/articoli-fcp/consigli-asta/132-guida-asta-fantacalcio.html`;

export async function GET() {
  try {
    const html = await fetchTesto(URL_GUIDA_ASTA);
    const squadre = parseFpediaGuidaAsta(html);
    const fuoriclasse = Array.from(new Set(squadre.flatMap((s) => s.fuoriclasse)));
    const ballottaggi = squadre.flatMap((s) => s.ballottaggi);
    return NextResponse.json({ fuoriclasse, ballottaggi });
  } catch (err) {
    console.error("[fpedia-ballottaggi] fetch fallito:", err);
    const errore = err instanceof Error ? err.message : "Errore imprevisto.";
    return NextResponse.json({ fuoriclasse: [], ballottaggi: [], errore });
  }
}
