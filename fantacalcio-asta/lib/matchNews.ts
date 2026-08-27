import { RawNewsItem } from "@/app/api/news/route";
import { NewsItem, Player, normalizeText } from "./types";
import { eDellaStagioneCorrente } from "./stagione";

function derivaTrend(testoCombinato: string): string | undefined {
  if (/infortun/.test(testoCombinato)) return "Infortunato";
  if (/squalific/.test(testoCombinato)) return "Squalificato";
  if (/panchina|riserva|escluso/.test(testoCombinato)) return "In panchina";
  if (/titolare|conferma/.test(testoCombinato)) return "Titolare fisso";
  if (/gran forma|ottima forma|in forma|migliore in campo/.test(testoCombinato)) return "In buona forma";
  return undefined;
}

/**
 * Incrocia gli articoli RSS gia' scaricati con l'elenco di giocatori da
 * aggiornare: cerca il nome del giocatore nel testo di titolo+estratto, scarta
 * gli articoli di stagioni passate (non utili per l'asta in corso), prende le
 * 3 notizie piu' recenti tra quelle rimaste e deduce (in modo euristico, sulla
 * base di parole chiave) rigorista/tiratore punizioni/angoli e un trend
 * qualitativo. I flag booleani vengono rafforzati (OR) rispetto al valore
 * gia' noto, cosi' un giro senza nuove menzioni non cancella un'informazione
 * trovata in passato.
 */
export function matchNews(players: Player[], rawItems: RawNewsItem[]): Record<string, Partial<Player>> {
  const now = new Date().toISOString();
  const risultati: Record<string, Partial<Player>> = {};

  const itemsConTesto = rawItems.map((item) => ({
    item,
    testo: normalizeText(`${item.titolo} ${item.estratto}`),
  }));

  for (const player of players) {
    const nomeNormalizzato = normalizeText(player.nome);
    if (!nomeNormalizzato) continue;

    const corrispondenze = itemsConTesto
      .filter(({ testo }) => testo.includes(nomeNormalizzato))
      .filter(({ item }) => eDellaStagioneCorrente(item.data));
    if (corrispondenze.length === 0) continue;

    corrispondenze.sort(
      (a, b) => new Date(b.item.data).getTime() - new Date(a.item.data).getTime()
    );
    const top3 = corrispondenze.slice(0, 3);
    const notizie: NewsItem[] = top3.map(({ item }) => ({
      titolo: item.titolo,
      data: item.data,
      link: item.link,
      fonte: item.fonte,
    }));

    const testoCombinato = corrispondenze.map((c) => c.testo).join(" ");

    risultati[player.id] = {
      notizie,
      notizieAggiornateIl: now,
      rigorista: Boolean(player.rigorista) || /rigor/.test(testoCombinato),
      tiratorePunizioni: Boolean(player.tiratorePunizioni) || /punizion/.test(testoCombinato),
      tiratoreAngoli: Boolean(player.tiratoreAngoli) || /calci? d.angolo|angolo/.test(testoCombinato),
      trendVoti: derivaTrend(testoCombinato) ?? player.trendVoti,
    };
  }

  return risultati;
}
