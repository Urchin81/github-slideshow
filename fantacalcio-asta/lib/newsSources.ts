/**
 * Feed RSS usati per cercare le notizie sui giocatori. Elenco di partenza con
 * fonti italiane di calcio note per pubblicare RSS pubblici: NON è stato
 * possibile verificarne la raggiungibilità dall'ambiente di sviluppo (rete
 * sandbox con accesso esterno limitato), quindi è probabile che qualche URL
 * vada corretto o sostituito una volta eseguita l'app con un normale accesso
 * a internet. Modifica pure questo elenco in base a cosa funziona per te.
 */
export interface NewsFeed {
  nome: string;
  url: string;
}

export const DEFAULT_NEWS_FEEDS: NewsFeed[] = [
  { nome: "ANSA Calcio", url: "https://www.ansa.it/sito/notizie/sport/calcio/calcio_rss.xml" },
  { nome: "Gazzetta dello Sport", url: "https://www.gazzetta.it/rss/home.xml" },
  { nome: "Tuttomercatoweb", url: "https://www.tuttomercatoweb.com/rss" },
];
