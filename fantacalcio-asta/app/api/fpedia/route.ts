import { NextRequest, NextResponse } from "next/server";
import { estraiIndiceGiocatori, FPEDIA_RUOLI_ELENCO, parseFpediaHtml } from "@/lib/fpedia";
import { trovaUrlGiocatoreInIndice, VoceIndiceGiocatore } from "@/lib/indiceGiocatori";

export const dynamic = "force-dynamic";

const USER_AGENT =
  "Mozilla/5.0 (compatible; AssistenteAstaFantacalcio/1.0; uso personale, non massivo)";
// Configurabile solo per i test locali (server HTML finto); in produzione resta il sito reale.
const FPEDIA_BASE_URL = process.env.FPEDIA_BASE_URL ?? "https://www.fantacalciopedia.com";
const FPEDIA_HOST = new URL(FPEDIA_BASE_URL).host;

const FETCH_TIMEOUT_MS = 15000;
const NOME_MAX_LEN = 200;

/**
 * Il server deve scaricare SOLO pagine di fantacalciopedia.com. L'indice dei
 * giocatori (nome -> URL scheda) viene costruito dagli <a href> trovati
 * dentro l'HTML scaricato dal sito stesso: se quella pagina fosse mai
 * compromessa o alterata, un link malevolo potrebbe puntare altrove (es. un
 * indirizzo di rete interna) e far diventare questo endpoint un proxy SSRF
 * verso qualunque destinazione (OWASP A10). Prima di ogni fetch verifichiamo
 * quindi che l'host coincida con quello atteso.
 */
function assicuraHostFpedia(url: string): void {
  const host = new URL(url).host;
  if (host !== FPEDIA_HOST) {
    throw new Error("URL esterno all'host FPEDIA atteso, richiesta bloccata.");
  }
}

async function fetchTesto(url: string): Promise<string> {
  assicuraHostFpedia(url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: controller.signal });
  } catch (err) {
    // "fetch failed" da solo non dice nulla: Node incapsula il motivo reale
    // (DNS, connessione rifiutata, TLS, timeout...) nella proprieta' "cause".
    // Il dettaglio va comunque solo nei log server: al client basta sapere
    // che il recupero e' fallito, senza esporre dettagli di rete interni.
    const causa = err instanceof Error ? (err.cause as unknown) : undefined;
    const dettaglioCausa = causa instanceof Error ? causa.message : causa ? String(causa) : undefined;
    const messaggioBase = err instanceof Error ? err.message : "Richiesta di rete fallita.";
    console.error(`[fpedia] fetch fallito per ${url}: ${messaggioBase}${dettaglioCausa ? ` — ${dettaglioCausa}` : ""}`);
    throw new Error("Impossibile raggiungere FPEDIA (rete o timeout).");
  } finally {
    clearTimeout(timeoutId);
  }
  if (!res.ok) {
    console.error(`[fpedia] risposta non ok (HTTP ${res.status}) su ${url}`);
    throw new Error("FPEDIA ha risposto con un errore.");
  }
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
