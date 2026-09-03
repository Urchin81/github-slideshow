import { NextRequest, NextResponse } from "next/server";
import { estraiIndiceGiocatori, FPEDIA_RUOLI_ELENCO, parseFpediaHtml } from "@/lib/fpedia";
import { trovaUrlGiocatoreInIndice, VoceIndiceGiocatore } from "@/lib/indiceGiocatori";
import { FPEDIA_BASE_URL, fetchTesto } from "@/lib/fpediaFetch";

export const dynamic = "force-dynamic";

const NOME_MAX_LEN = 200;

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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errore: "Corpo della richiesta non valido (JSON atteso)." }, { status: 400 });
  }

  const nome = (body as { nome?: unknown } | null)?.nome;
  if (!nome || typeof nome !== "string" || nome.trim().length === 0) {
    return NextResponse.json({ errore: "Nome giocatore mancante." }, { status: 400 });
  }
  if (nome.length > NOME_MAX_LEN) {
    return NextResponse.json({ errore: "Nome giocatore troppo lungo." }, { status: 400 });
  }

  try {
    const indice = await otteniIndice();
    const url = trovaUrlGiocatoreInIndice(indice, nome, FPEDIA_BASE_URL);
    if (!url) {
      return NextResponse.json({ stats: null, errore: "Nessuna corrispondenza esatta trovata su FPEDIA." });
    }

    const html = await fetchTesto(url);
    const stats = parseFpediaHtml(html, url);
    return NextResponse.json({ stats });
  } catch (err) {
    console.error("[fpedia] errore imprevisto:", err);
    return NextResponse.json(
      { stats: null, errore: err instanceof Error ? err.message : "Errore imprevisto." },
      { status: 200 }
    );
  }
}
