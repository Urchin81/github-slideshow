/**
 * Feed RSS usati per cercare le notizie sui giocatori. Verificati manualmente
 * (apertura diretta -> XML valido `application/rss+xml`/`text/xml`, nessun
 * redirect a pagina HTML o login) il 27/08/2026, dato che l'accesso in
 * uscita da questo ambiente di sviluppo è limitato e non permette di
 * verificarli in autonomia. Se in futuro qualcuno smette di rispondere,
 * modifica pure questo elenco in base a cosa funziona per te.
 */
export interface NewsFeed {
  nome: string;
  url: string;
}

export const DEFAULT_NEWS_FEEDS: NewsFeed[] = [
  { nome: "ANSA Calcio", url: "https://www.ansa.it/sito/notizie/sport/calcio/calcio_rss.xml" },
  { nome: "Gazzetta dello Sport — Serie A", url: "https://www.gazzetta.it/dynamic-feed/rss/section/Calcio/Serie-A.xml" },
  { nome: "Gazzetta dello Sport — Calciomercato", url: "https://www.gazzetta.it/dynamic-feed/rss/section/Calciomercato.xml" },
  { nome: "TuttoMercatoWeb — Ultime notizie", url: "https://www.tuttomercatoweb.com/rss/" },
  { nome: "TuttoMercatoWeb — Serie A", url: "https://www.tuttomercatoweb.com/rss/?s=1" },
];
