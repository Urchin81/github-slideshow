import { NextRequest, NextResponse } from "next/server";
import { estraiIndiceGiocatori, parseFstatsHtml, trovaUrlGiocatore, VoceIndiceFstats } from "@/lib/fstats";

export const dynamic = "force-dynamic";

const USER_AGENT =
  "Mozilla/5.0 (compatible; AssistenteAstaFantacalcio/1.0; uso personale, non massivo)";
// Configurabile solo per i test locali (server HTML finto); in produzione resta il sito reale.
const FSTATS_BASE_URL = process.env.FSTATS_BASE_URL ?? "https://footystats.org";
const FSTATS_INDICE_PATH = process.env.FSTATS_INDICE_PATH ?? "/italy/serie-a/players";

async function fetchTesto(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} su ${url}`);
  return res.text();
}

let indiceCache: { voci: VoceIndiceFstats[]; scaricatoIl: number } | null = null;
const INDICE_TTL_MS = 30 * 60 * 1000;

/**
 * Il motore di ricerca di footystats.org e' basato su JS/AJAX e non e'
 * utilizzabile lato server: si scarica invece UNA VOLTA la pagina che elenca
 * tutti i giocatori di Serie A e si costruisce un indice nome -> URL, tenuto
 * in cache per la durata di un giro di aggiornamento.
 */
async function otteniIndice(): Promise<VoceIndiceFstats[]> {
  if (indiceCache && Date.now() - indiceCache.scaricatoIl < INDICE_TTL_MS) {
    return indiceCache.voci;
  }
  const html = await fetchTesto(`${FSTATS_BASE_URL}${FSTATS_INDICE_PATH}`);
  const voci = estraiIndiceGiocatori(html);
  indiceCache = { voci, scaricatoIl: Date.now() };
  return voci;
}

/**
 * Risolve e recupera le statistiche stagione precedente di UN giocatore da
 * footystats.org (FSTATS). Un giocatore per richiesta (il client chiama in
 * sequenza con una pausa) per non sovraccaricare il sito.
 */
export async function POST(request: NextRequest) {
  const { nome } = await request.json();
  if (!nome || typeof nome !== "string") {
    return NextResponse.json({ errore: "Nome giocatore mancante." }, { status: 400 });
  }

  try {
    const indice = await otteniIndice();
    const url = trovaUrlGiocatore(indice, nome, FSTATS_BASE_URL);
    if (!url) {
      return NextResponse.json({ stats: null, errore: "Nessuna pagina trovata su FSTATS." });
    }

    const html = await fetchTesto(url);
    const stats = parseFstatsHtml(html, url);
    return NextResponse.json({ stats });
  } catch (err) {
    return NextResponse.json(
      { stats: null, errore: err instanceof Error ? err.message : "Errore imprevisto." },
      { status: 200 }
    );
  }
}
