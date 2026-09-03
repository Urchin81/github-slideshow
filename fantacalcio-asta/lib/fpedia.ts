import * as cheerio from "cheerio";
import { FpediaPillola, FpediaStagionePrecedente, FpediaStats, FpediaTag, LivelloFpedia } from "./types";
import { VoceIndiceGiocatore } from "./indiceGiocatori";

// FPEDIA colora "pillole" e tag con una classe "fondoXXX" che riflette un
// semaforo a 5 livelli (mostrato nella legenda del sito: super=azzurro,
// buono=verde, sufficiente=giallo, mediocre=arancione, negativo=rosso, usato
// anche per "nd"). Solo "fondorouge" e "fondoverdegiallo" sono confermate da
// un campione HTML reale (lib/__fixtures__/fpedia-sample.html); le altre
// seguono lo stesso schema di nome ma non sono ancora state viste in un
// campione — correggile qui se non corrispondono a quanto vedi sul sito.
const LIVELLO_PER_CLASSE: Record<string, LivelloFpedia> = {
  fondorouge: "negativo",
  fondorosso: "negativo",
  fondoverdegiallo: "sufficiente",
  fondoazzurro: "super",
  fondoblu: "super",
  fondoverde: "buono",
  fondogiallo: "sufficiente",
  fondoarancio: "mediocre",
  fondoarancione: "mediocre",
};

function livelloDaClasse(classAttr: string | undefined): LivelloFpedia {
  if (!classAttr) return null;
  for (const classe of classAttr.split(/\s+/)) {
    if (classe in LIVELLO_PER_CLASSE) return LIVELLO_PER_CLASSE[classe];
  }
  return null;
}

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

  // FantaMedia della stagione in corso (etichetta "Fanta Media AAAA-AAAA:", diversa da "Media
  // Fanta Voto AAAA-AAAA" delle stagioni passate sopra): non e' nel grafico a barre (che ha solo
  // MV, il voto puro), quindi si estrae qui dal testo grezzo — senza bisogno di conoscere l'anno
  // esatto, che cambia ad ogni stagione.
  const matchFantamedia = html.match(/Fanta Media\s+\d{4}-\d{4}:?\s*(?:<[^>]+>\s*)*([\d.,]+)/i);
  const fantamedia = matchFantamedia ? numeroPulito(matchFantamedia[1]) : undefined;

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
    else if (/Solidit.*fantainvestimento/i.test(label)) soliditaInvestimento = percent;
    else if (/Resistenza infortuni/i.test(label)) resistenzaInfortuni = percent;
  });

  const tags: FpediaTag[] = [];
  $(".mc_hookEvolution span.stickdanpic").each((_, el) => {
    const label = $(el).text().trim();
    if (label) tags.push({ label, livello: livelloDaClasse($(el).attr("class")) });
  });

  // Tutte le "pillole" colorate della pagina (span.stickdan, non stickdanpic che sono i tag):
  // ognuna e' etichettata dal <strong> che la precede tra i fratelli piu' vicini, non dal
  // primo del contenitore, perche' piu' pillole possono condividere lo stesso blocco
  // (es. Presenze/FantaMedia/FM su tot gare sono tre span nello stesso div.label12).
  const pillole: FpediaPillola[] = [];
  $("span.stickdan").each((_, el) => {
    const $el = $(el);
    const valore = $el.text().replace(/\s+/g, " ").trim();
    if (!valore) return;
    const label = $el.prevAll("strong").first().text().replace(/:\s*$/, "").trim();
    pillole.push({ label: label || "—", valore, livello: livelloDaClasse($el.attr("class")) });
  });

  const immagineUrl = $('img[alt^="disegno di"]').first().attr("src");
  const squadraLogoUrl = $('img[alt^="maglia di"]').first().attr("src");

  const descrizione = $("div.font18.mc_hookEvolution p").first().text().trim() || undefined;

  return {
    url,
    ruolo,
    squadra,
    dataNascita,
    altezzaCm,
    pesoKg,
    nazionalita,
    immagineUrl,
    squadraLogoUrl,
    algFcp,
    punteggioFcp,
    soliditaInvestimento,
    resistenzaInfortuni,
    presenze,
    gol,
    assist,
    mediaVoto,
    fantamedia,
    ammonizioni,
    espulsioni,
    presenzePreviste,
    golPrevisti,
    assistPrevisti,
    pillole,
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
