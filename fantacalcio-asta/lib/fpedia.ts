import * as cheerio from "cheerio";
import { FpediaStagionePrecedente, FpediaStats } from "./types";
import { VoceIndiceGiocatore } from "./indiceGiocatori";

function numeroPulito(testo: string | undefined): number | undefined {
  if (!testo) return undefined;
  const n = parseFloat(testo.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function range(testo: string | undefined): [number, number] | undefined {
  if (!testo) return undefined;
  const m = testo.match(/(\d+)\s*\/\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : undefined;
}

/**
 * Estrae il testo che segue una label dentro un blocco HTML, saltando i tag
 * che la separano dal suo valore (es. "</strong><br /><span ...>VALORE</span>").
 * Piu' robusto della semplice .text() perche' non si confonde con altre label
 * che condividono lo stesso contenitore.
 */
function estraiCampo(html: string, label: string): string | undefined {
  const labelEscaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(labelEscaped + "\\s*(?:<[^>]+>\\s*)*([^<]+)", "i");
  const m = html.match(re);
  return m ? m[1].replace(/\s+/g, " ").trim() : undefined;
}

function valoreStickdan($el: cheerio.Cheerio<any>): string | undefined {
  const testo = $el.first().clone().children("small").remove().end().text().replace(/\s+/g, " ").trim();
  return testo || undefined;
}

export function parseFpediaHtml(html: string, url: string): FpediaStats {
  const $ = cheerio.load(html);

  const paragrafoInfo = $('p:has(strong:contains("Data nascita:"))').first().html() ?? "";
  const ruolo = estraiCampo(paragrafoInfo, "Ruolo:");
  const dataNascita = estraiCampo(paragrafoInfo, "Data nascita:");
  const altezzaCm = numeroPulito(estraiCampo(paragrafoInfo, "Altezza:")?.replace("cm", ""));
  const pesoKg = numeroPulito(estraiCampo(paragrafoInfo, "Peso:")?.replace("kg", ""));
  const nazionalita = estraiCampo(paragrafoInfo, "Nazionalità:")?.replace(/Club:.*$/, "").trim();
  const squadra = estraiCampo(paragrafoInfo, "Club:");

  // Medie fantavoto delle stagioni precedenti (blocchi "Media Fanta Voto AAAA-AAAA").
  const stagioniPrecedenti: FpediaStagionePrecedente[] = [];
  $(".col_one_fourth.nobottommargin .label12").each((_, el) => {
    const strongText = $(el).find("strong").first().text().trim();
    const m = strongText.match(/Media Fanta Voto (\d{4}-\d{4})/);
    if (!m) return;
    const valoreTesto = valoreStickdan($(el).find("span.stickdan"));
    const presenzeTesto = $(el).find("span.rouge").first().text().trim();
    stagioniPrecedenti.push({
      stagione: m[1],
      mediaVoto: valoreTesto && valoreTesto !== "nd" ? numeroPulito(valoreTesto) : undefined,
      presenze: numeroPulito(presenzeTesto),
    });
  });

  // Statistiche stagione corrente: dal grafico a barre (presenze, gol, assist, media voto, ammonizioni, espulsioni).
  let presenze: number | undefined;
  let gol: number | undefined;
  let assist: number | undefined;
  let mediaVoto: number | undefined;
  let ammonizioni: number | undefined;
  let espulsioni: number | undefined;

  const scriptConGrafico = $("script")
    .toArray()
    .map((el) => $(el).html() ?? "")
    .find((s) => s.includes('"presenze","golF","ass","MV","amm","esp"'));
  if (scriptConGrafico) {
    const m = scriptConGrafico.match(/"data":\s*\[\s*([\d.,\s]+)\]/);
    if (m) {
      const numeri = m[1].split(",").map((n) => Number(n.trim()));
      [presenze, gol, assist, mediaVoto, ammonizioni, espulsioni] = numeri;
    }
  }

  // Previsionali (blocco "Presenze previste:" / "Gol previsti:" / "Assist previsti:").
  const blocoPrevisionali = $('.label12:has(strong:contains("Presenze previste:"))').first().html() ?? "";
  const presenzePreviste = range(estraiCampo(blocoPrevisionali, "Presenze previste:"));
  const golPrevisti = range(estraiCampo(blocoPrevisionali, "Gol previsti:"));
  const assistPrevisti = range(estraiCampo(blocoPrevisionali, "Assist previsti:"));

  // Skills: ALG FCP, Punteggio FantaCalcioPedia, Solidita' investimento, Resistenza infortuni.
  let algFcp: number | undefined;
  let punteggioFcp: number | undefined;
  let soliditaInvestimento: number | undefined;
  let resistenzaInfortuni: number | undefined;
  $("ul.skills li[data-percent]").each((_, el) => {
    const label = $(el).find("span").first().text().trim();
    const percent = Number($(el).attr("data-percent"));
    if (!Number.isFinite(percent)) return;
    if (/^ALG FCP/i.test(label)) algFcp = percent;
    else if (/Punteggio FantaCalcioPedia/i.test(label)) punteggioFcp = percent;
    else if (/Solidit.*fantainvestimento/i.test(label)) soliditaInvestimento = Math.round(percent / 20);
    else if (/Resistenza infortuni/i.test(label)) resistenzaInfortuni = Math.round(percent / 20);
  });

  const tags: string[] = [];
  $(".mc_hookEvolution span.stickdanpic").each((_, el) => {
    const t = $(el).text().trim();
    if (t) tags.push(t);
  });

  const descrizione = $("div.font18.mc_hookEvolution p").first().text().trim() || undefined;

  return {
    url,
    ruolo,
    squadra,
    dataNascita,
    altezzaCm,
    pesoKg,
    nazionalita,
    algFcp,
    punteggioFcp,
    soliditaInvestimento,
    resistenzaInfortuni,
    presenze,
    gol,
    assist,
    mediaVoto,
    ammonizioni,
    espulsioni,
    presenzePreviste,
    golPrevisti,
    assistPrevisti,
    tags,
    descrizione,
    stagioniPrecedenti,
    aggiornatoIl: new Date().toISOString(),
  };
}

/**
 * Ruoli con una pagina elenco separata su FPEDIA (usati nell'URL, in minuscolo):
 * https://www.fantacalciopedia.com/lista-calciatori-serie-a/{ruolo}/ elenca
 * TUTTI i giocatori di quel ruolo, senza paginazione, con nome e link alla
 * scheda gia' nel markup — a differenza del motore di ricerca del sito (che
 * si e' rivelato non richiamabile lato server), qui basta una richiesta a
 * ruolo. Struttura confermata da due scraper indipendenti che leggono questo
 * stesso sito: github.com/protti/ScraperFantacalcio e
 * github.com/DrElegantia/fanta-app.
 */
export const FPEDIA_RUOLI_ELENCO = ["portieri", "difensori", "centrocampisti", "attaccanti"];

/**
 * Estrae dalla pagina elenco di un ruolo la lista di giocatori (nome + URL
 * della scheda), per costruire un indice nome -> pagina senza dover indovinare
 * un endpoint di ricerca.
 */
export function estraiIndiceGiocatori(html: string): VoceIndiceGiocatore[] {
  const $ = cheerio.load(html);
  const voci: VoceIndiceGiocatore[] = [];
  $("div.col_full.giocatore").each((_, el) => {
    const nome = $(el).find("h3.tit_calc").first().text().replace(/\s+/g, " ").trim();
    const url = $(el).find("a.label.label-default.fondoindaco").first().attr("href");
    if (nome && url) voci.push({ nome, url });
  });
  return voci;
}
