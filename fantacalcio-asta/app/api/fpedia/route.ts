import { NextRequest, NextResponse } from "next/server";
import { parseFpediaHtml, risolviGiocatoreFpedia, urlRicercaFpedia } from "@/lib/fpedia";

export const dynamic = "force-dynamic";

const USER_AGENT =
  "Mozilla/5.0 (compatible; AssistenteAstaFantacalcio/1.0; uso personale, non massivo)";
// Configurabile solo per i test locali (server RSS/HTML finto); in produzione resta il sito reale.
const FPEDIA_BASE_URL = process.env.FPEDIA_BASE_URL ?? "https://www.fantacalciopedia.com";

interface Tentativo {
  url: string;
  esito: "trovato" | "nessuna-corrispondenza" | "http-error";
  candidatiTotali?: number;
  candidatiConCognome?: number;
  usataIniziale?: boolean;
  dettaglio?: string;
}

async function fetchTesto(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} su ${url}`);
  return res.text();
}

/**
 * Risolve e recupera le statistiche stagione corrente di UN giocatore da
 * fantacalciopedia.com: prova in sequenza i percorsi di ricerca del sito
 * (vedi lib/fpedia.ts) e per ognuno richiede una corrispondenza esatta col
 * cognome; se non trova nulla in nessun tentativo restituisce un errore con
 * il dettaglio di cosa e' successo per ogni tentativo (utile per il "test su
 * campione" nella pagina Settings). Un giocatore per richiesta (il client
 * chiama in sequenza con una pausa) per non sovraccaricare il sito.
 */
export async function POST(request: NextRequest) {
  const { nome } = await request.json();
  if (!nome || typeof nome !== "string") {
    return NextResponse.json({ errore: "Nome giocatore mancante." }, { status: 400 });
  }

  const tentativi: Tentativo[] = [];

  try {
    for (const urlRicerca of urlRicercaFpedia(FPEDIA_BASE_URL, nome)) {
      let risultatiRicerca: string;
      try {
        risultatiRicerca = await fetchTesto(urlRicerca);
      } catch (err) {
        tentativi.push({
          url: urlRicerca,
          esito: "http-error",
          dettaglio: err instanceof Error ? err.message : "Errore di rete.",
        });
        continue;
      }

      const risoluzione = risolviGiocatoreFpedia(risultatiRicerca, nome);
      if (!risoluzione.url) {
        tentativi.push({
          url: urlRicerca,
          esito: "nessuna-corrispondenza",
          candidatiTotali: risoluzione.candidatiTotali,
          candidatiConCognome: risoluzione.candidatiConCognome,
        });
        continue;
      }

      tentativi.push({
        url: urlRicerca,
        esito: "trovato",
        candidatiTotali: risoluzione.candidatiTotali,
        candidatiConCognome: risoluzione.candidatiConCognome,
        usataIniziale: risoluzione.usataIniziale,
      });

      const html = await fetchTesto(risoluzione.url);
      const stats = parseFpediaHtml(html, risoluzione.url);
      return NextResponse.json({ stats, debug: { tentativi } });
    }

    return NextResponse.json({
      stats: null,
      errore: "Nessuna corrispondenza esatta trovata su FPEDIA.",
      debug: { tentativi },
    });
  } catch (err) {
    return NextResponse.json(
      { stats: null, errore: err instanceof Error ? err.message : "Errore imprevisto.", debug: { tentativi } },
      { status: 200 }
    );
  }
}
