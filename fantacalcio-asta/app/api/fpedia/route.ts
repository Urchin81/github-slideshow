import { NextRequest, NextResponse } from "next/server";
import { estraiUrlGiocatoreDaRicerca, parseFpediaHtml } from "@/lib/fpedia";

export const dynamic = "force-dynamic";

const USER_AGENT =
  "Mozilla/5.0 (compatible; AssistenteAstaFantacalcio/1.0; uso personale, non massivo)";
// Configurabile solo per i test locali (server RSS/HTML finto); in produzione resta il sito reale.
const FPEDIA_BASE_URL = process.env.FPEDIA_BASE_URL ?? "https://www.fantacalciopedia.com";

async function fetchTesto(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} su ${url}`);
  return res.text();
}

/**
 * Risolve e recupera le statistiche stagione corrente di UN giocatore da
 * fantacalciopedia.com: prima cerca la sua pagina tramite il motore di
 * ricerca del sito, poi la scarica e la analizza. Un giocatore per richiesta
 * (il client chiama in sequenza con una pausa) per non sovraccaricare il sito
 * con richieste parallele.
 */
export async function POST(request: NextRequest) {
  const { nome } = await request.json();
  if (!nome || typeof nome !== "string") {
    return NextResponse.json({ errore: "Nome giocatore mancante." }, { status: 400 });
  }

  try {
    const risultatiRicerca = await fetchTesto(
      `${FPEDIA_BASE_URL}/ricerca.php?s=${encodeURIComponent(nome)}`
    );
    const url = estraiUrlGiocatoreDaRicerca(risultatiRicerca, nome);
    if (!url) {
      return NextResponse.json({ stats: null, errore: "Nessuna pagina trovata su FPEDIA." });
    }

    const html = await fetchTesto(url);
    const stats = parseFpediaHtml(html, url);
    return NextResponse.json({ stats });
  } catch (err) {
    return NextResponse.json(
      { stats: null, errore: err instanceof Error ? err.message : "Errore imprevisto." },
      { status: 200 }
    );
  }
}
