import { NextRequest, NextResponse } from "next/server";
import { estraiIndiceGiocatori, FPEDIA_RUOLI_ELENCO, parseFpediaHtml } from "@/lib/fpedia";
import { trovaUrlGiocatoreInIndice, VoceIndiceGiocatore } from "@/lib/indiceGiocatori";

export const dynamic = "force-dynamic";

const USER_AGENT =
  "Mozilla/5.0 (compatible; AssistenteAstaFantacalcio/1.0; uso personale, non massivo)";
// Configurabile solo per i test locali (server HTML finto); in produzione resta il sito reale.
const FPEDIA_BASE_URL = process.env.FPEDIA_BASE_URL ?? "https://www.fantacalciopedia.com";

async function fetchTesto(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} su ${url}`);
  return res.text();
}

let indiceCache: { voci: VoceIndiceGiocatore[]; scaricatoIl: number } | null = null;
const INDICE_TTL_MS = 30 * 60 * 1000;

/**
 * Il motore di ricerca del sito non e' richiamabile lato server: si
 * scaricano invece UNA VOLTA le pagine elenco dei 4 ruoli (che riportano
 * TUTTI i giocatori di quel ruolo senza paginazione, con nome e link alla
 * scheda gia' nel markup) e si costruisce un indice nome -> pagina, tenuto
 * in cache per la durata di un giro di aggiornamento.
 */
async function otteniIndice(): Promise<VoceIndiceGiocatore[]> {
  if (indiceCache && Date.now() - indiceCache.scaricatoIl < INDICE_TTL_MS) {
    return indiceCache.voci;
  }
  const pagine = await Promise.all(
    FPEDIA_RUOLI_ELENCO.map((ruolo) => fetchTesto(`${FPEDIA_BASE_URL}/lista-calciatori-serie-a/${ruolo}/`))
  );
  const voci = pagine.flatMap((html) => estraiIndiceGiocatori(html));
  indiceCache = { voci, scaricatoIl: Date.now() };
  return voci;
}

/**
 * Risolve e recupera le statistiche stagione corrente di UN giocatore da
 * fantacalciopedia.com (FPEDIA). Un giocatore per richiesta (il client
 * chiama in sequenza con una pausa) per non sovraccaricare il sito.
 */
export async function POST(request: NextRequest) {
  const { nome } = await request.json();
  if (!nome || typeof nome !== "string") {
    return NextResponse.json({ errore: "Nome giocatore mancante." }, { status: 400 });
  }

  try {
    const indice = await otteniIndice();
    const url = trovaUrlGiocatoreInIndice(indice, nome, FPEDIA_BASE_URL);
    if (!url) {
      return NextResponse.json({
        stats: null,
        errore: "Nessuna corrispondenza esatta trovata su FPEDIA.",
        debug: { indiceDimensione: indice.length },
      });
    }

    const html = await fetchTesto(url);
    const stats = parseFpediaHtml(html, url);
    return NextResponse.json({ stats, debug: { indiceDimensione: indice.length, url } });
  } catch (err) {
    return NextResponse.json(
      {
        stats: null,
        errore: err instanceof Error ? err.message : "Errore imprevisto.",
        debug: { indiceDimensione: indiceCache?.voci.length ?? 0 },
      },
      { status: 200 }
    );
  }
}
