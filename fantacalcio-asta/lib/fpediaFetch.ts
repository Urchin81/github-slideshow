// Esportato perché riusato anche da app/api/news/route.ts per i feed RSS: stesso
// user agent onesto (si presenta come app, non finge un browser) per tutte le
// richieste in uscita dell'app, invece di uno per servizio.
export const USER_AGENT =
  "Mozilla/5.0 (compatible; AssistenteAstaFantacalcio/1.0; uso personale, non massivo)";
// Configurabile solo per i test locali (server HTML finto); in produzione resta il sito reale.
export const FPEDIA_BASE_URL = process.env.FPEDIA_BASE_URL ?? "https://www.fantacalciopedia.com";
const FPEDIA_HOST = new URL(FPEDIA_BASE_URL).host;

const FETCH_TIMEOUT_MS = 15000;

/**
 * Il server deve scaricare SOLO pagine di fantacalciopedia.com. Se una pagina di
 * quel sito venisse mai compromessa o alterata, un link malevolo al suo interno
 * potrebbe puntare altrove (es. un indirizzo di rete interna) e far diventare
 * questo endpoint un proxy SSRF verso qualunque destinazione (OWASP A10). Prima
 * di ogni fetch verifichiamo quindi che l'host coincida con quello atteso.
 */
export function assicuraHostFpedia(url: string): void {
  const host = new URL(url).host;
  if (host !== FPEDIA_HOST) {
    throw new Error("URL esterno all'host FPEDIA atteso, richiesta bloccata.");
  }
}

export async function fetchTesto(url: string): Promise<string> {
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
