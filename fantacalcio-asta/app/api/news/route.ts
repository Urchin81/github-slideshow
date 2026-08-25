import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import { DEFAULT_NEWS_FEEDS, NewsFeed } from "@/lib/newsSources";

export const dynamic = "force-dynamic";

export interface RawNewsItem {
  titolo: string;
  link: string;
  data: string;
  estratto: string;
  fonte: string;
}

export interface NewsFeedError {
  feed: string;
  messaggio: string;
}

/**
 * Recupera e appiattisce gli articoli dai feed RSS configurati. Il fetch
 * avviene lato server (qui) per evitare i blocchi CORS che si avrebbero
 * chiamando gli RSS direttamente dal browser.
 *
 * I feed sono SEMPRE quelli fissi di lib/newsSources.ts, mai un URL passato
 * dal client: accettare un URL arbitrario dal body della richiesta
 * permetterebbe a chiunque di far effettuare al server richieste verso
 * qualsiasi destinazione (rete interna inclusa) — un classico SSRF
 * (OWASP A10). Se in futuro serve rendere i feed configurabili, l'input va
 * validato contro un elenco di host consentiti, non passato cosi' com'e'.
 */
export async function POST(_request: NextRequest) {
  const feeds: NewsFeed[] = DEFAULT_NEWS_FEEDS;
  const parser = new Parser({ timeout: 10000 });
  const items: RawNewsItem[] = [];
  const errori: NewsFeedError[] = [];

  await Promise.all(
    feeds.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        for (const item of parsed.items ?? []) {
          items.push({
            titolo: item.title ?? "",
            link: item.link ?? "",
            data: item.isoDate ?? item.pubDate ?? "",
            estratto: item.contentSnippet ?? item.content ?? "",
            fonte: feed.nome,
          });
        }
      } catch (err) {
        errori.push({
          feed: feed.nome,
          messaggio: err instanceof Error ? err.message : String(err),
        });
      }
    })
  );

  return NextResponse.json({ items, errori });
}
