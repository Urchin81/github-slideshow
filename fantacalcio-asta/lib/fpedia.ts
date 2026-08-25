import * as cheerio from "cheerio";
import { FpediaStagionePrecedente, FpediaStats, normalizeText, scomponiNomeListino } from "./types";

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

// Non ancorato al dominio (solo al pattern di percorso), cosi' funziona anche
// se il sito passa a un altro host/sottodominio o durante i test con un server locale.
const URL_GIOCATORE_REGEX = /https?:\/\/[^\s"'<>]+\/lista-calciatori-serie-a\/[a-z]+\/\d+\/[a-z0-9-]+\.html/gi;

function partiSlug(url: string): string[] {
  const slug = url.split("/").pop()?.replace(/\.html$/i, "") ?? "";
  return normalizeText(slug).split("-").filter(Boolean);
}

/** Il listino ha solo il cognome: e' incluso in una parte dello slug se coincide o ne e' una sottostringa. */
function coincideConCognome(partiCandidato: string[], cognomeParti: string[]): boolean {
  return cognomeParti.every((parte) => partiCandidato.some((p) => p === parte || p.includes(parte)));
}

export interface RisultatoRicercaFpedia {
  url: string | null;
  /** Quanti link a pagine giocatore sono stati trovati nella pagina di ricerca (0 = la ricerca stessa non ha funzionato). */
  candidatiTotali: number;
  /** Quanti di quei link contenevano per intero il cognome cercato (0 = nessuna corrispondenza esatta). */
  candidatiConCognome: number;
  usataIniziale: boolean;
}

/**
 * Risolve l'URL della pagina di un giocatore su FPEDIA a partire dall'HTML
 * di una pagina di ricerca. Il listino Fantacalcio.it riporta solo il
 * cognome (con l'iniziale del nome se serve a distinguere omonimi, es.
 * "Adekunle A."), mentre FPEDIA usa slug "cognome-nome" (es.
 * "scamacca-gianluca"): per una corrispondenza esatta si richiede che TUTTE
 * le parole del cognome compaiano nello slug, e se ci sono più candidati con
 * lo stesso cognome si usa l'iniziale del nome per scegliere quello giusto.
 * Non dipende dal markup esatto della pagina risultati: estrae con una
 * regex qualsiasi link che segua il formato delle pagine giocatore, cosi'
 * resta valido anche se il template dei risultati cambia.
 */
export function risolviGiocatoreFpedia(html: string, nomeCercato: string): RisultatoRicercaFpedia {
  const { cognome, iniziale } = scomponiNomeListino(nomeCercato);
  const cognomeParti = normalizeText(cognome).split(/\s+/).filter(Boolean);

  const urlCandidati = Array.from(new Set(html.match(URL_GIOCATORE_REGEX) ?? []));
  const candidati = urlCandidati.map((url) => ({ url, parti: partiSlug(url) }));
  const conCognome = candidati.filter(({ parti }) => coincideConCognome(parti, cognomeParti));

  if (conCognome.length === 0) {
    return { url: null, candidatiTotali: urlCandidati.length, candidatiConCognome: 0, usataIniziale: false };
  }

  if (iniziale && conCognome.length > 1) {
    const inizialeNorm = normalizeText(iniziale);
    const conIniziale = conCognome.filter(({ parti }) => {
      // Il nome proprio nello slug segue le parti del cognome (es. "scamacca-gianluca" -> "gianluca" dopo "scamacca").
      const restanti = parti.filter((p) => !cognomeParti.some((c) => p === c || p.includes(c)));
      return restanti.some((p) => p.startsWith(inizialeNorm));
    });
    if (conIniziale.length > 0) {
      return {
        url: conIniziale[0].url,
        candidatiTotali: urlCandidati.length,
        candidatiConCognome: conCognome.length,
        usataIniziale: true,
      };
    }
  }

  return {
    url: conCognome[0].url,
    candidatiTotali: urlCandidati.length,
    candidatiConCognome: conCognome.length,
    usataIniziale: false,
  };
}

/** Percorsi di ricerca da provare in ordine: il sito e' su WordPress (ricerca standard "?s="), con un vecchio percorso come riserva. */
export function urlRicercaFpedia(baseUrl: string, nomeCercato: string): string[] {
  const { cognome } = scomponiNomeListino(nomeCercato);
  const q = encodeURIComponent(cognome);
  return [`${baseUrl}/?s=${q}`, `${baseUrl}/ricerca.php?s=${q}`];
}
