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
 */
export async function POST(request: NextRequest) {
  let feeds: NewsFeed[] = DEFAULT_NEWS_FEEDS;
  try {
    const body = await request.json();
    if (Array.isArray(body?.feeds) && body.feeds.length > 0) {
      feeds = body.feeds;
    }
  } catch {
    // Nessun body fornito: usa i feed di default.
  }

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
