import * as cheerio from "cheerio";
import { FstatsStats, normalizeText } from "./types";

function numeroPulito(testo: string | undefined): number | undefined {
  if (!testo) return undefined;
  const n = parseFloat(testo.replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

/** Stessa strategia di lib/fpedia.ts: label + tag intermedi (anche <img>/<a>) + testo che segue. */
function estraiCampo(html: string, label: string): string | undefined {
  const labelEscaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(labelEscaped + "\\s*(?:<[^>]+>\\s*)*([^<]+)", "i");
  const m = html.match(re);
  return m ? m[1].replace(/\s+/g, " ").trim() : undefined;
}

export interface VoceIndiceFstats {
  nome: string;
  url: string;
}

// Non ancorato al dominio: qualsiasi link a "/players/<paese>/<slug>" con il nome
// del giocatore come testo, cosi' funziona anche con un server locale nei test.
const LINK_GIOCATORE_REGEX =
  /<a\s+href=(["'])(\/players\/[a-z0-9-]+\/[a-z0-9-]+)\1[^>]*>([^<]+)<\/a>/gi;

/**
 * Costruisce un indice nome -> URL a partire dalla pagina che elenca tutti i
 * giocatori di una lega (es. footystats.org/italy/serie-a/players). Una sola
 * richiesta per l'intero elenco, invece di una ricerca per ogni giocatore (il
 * motore di ricerca del sito e' basato su JS/AJAX e non e' utilizzabile lato
 * server come quello di FPEDIA).
 */
export function estraiIndiceGiocatori(html: string): VoceIndiceFstats[] {
  const voci: VoceIndiceFstats[] = [];
  for (const m of html.matchAll(LINK_GIOCATORE_REGEX)) {
    const url = m[2];
    const nome = m[3].replace(/\s+/g, " ").trim();
    if (nome) voci.push({ nome, url });
  }
  return voci;
}

/**
 * Trova nell'indice l'URL del giocatore cercato. A differenza della ricerca
 * FPEDIA (pochi risultati già scoped sul nome), qui l'indice contiene tutti i
 * giocatori del campionato: richiede che TUTTE le parti del nome cercato
 * compaiano nel nome candidato, altrimenti niente match (evita falsi positivi
 * su un indice cosi' grande).
 */
export function trovaUrlGiocatore(
  indice: VoceIndiceFstats[],
  nomeCercato: string,
  baseUrl: string
): string | null {
  const parti = normalizeText(nomeCercato).split(/\s+/).filter(Boolean);
  if (parti.length === 0) return null;

  function punteggio(nome: string): number {
    const normalizzato = normalizeText(nome);
    return parti.filter((parte) => normalizzato.includes(parte)).length;
  }

  const candidati = indice
    .map((voce) => ({ voce, punti: punteggio(voce.nome) }))
    .sort((a, b) => b.punti - a.punti);
  const migliore = candidati[0];
  if (!migliore || migliore.punti < parti.length) return null;

  return new URL(migliore.voce.url, baseUrl).toString();
}

export function parseFstatsHtml(html: string, url: string): FstatsStats {
  const $ = cheerio.load(html);

  const bioHtml = $(".club-generic-flex").first().html() ?? "";
  const squadra = estraiCampo(bioHtml, "Club Team :");
  const nazionaleSquadra = estraiCampo(bioHtml, "National Team :");
  const posizione = estraiCampo(bioHtml, "Position : ");
  const nazionalita = estraiCampo(bioHtml, "Nationality : ");
  const piede = estraiCampo(bioHtml, "Foot : ");
  const etaTesto = estraiCampo(bioHtml, "Age : ");
  const altezzaTesto = estraiCampo(bioHtml, "Height : ");
  const pesoTesto = estraiCampo(bioHtml, "Weight : ");

  const etaMatch = etaTesto?.match(/(\d+)\s*\(([^)]+)\)/);
  const eta = etaMatch ? Number(etaMatch[1]) : numeroPulito(etaTesto);
  const dataNascita = etaMatch ? etaMatch[2].trim() : undefined;
  const altezzaCm = numeroPulito(altezzaTesto);
  const pesoKg = numeroPulito(pesoTesto);

  // La "stagione corrente" secondo il sito e' quella con il pulsante attivo nel
  // selettore in cima alla pagina: serve come riferimento per riconoscere
  // stagioni future/anomale elencate nella sezione storica (vedi sotto).
  const stagioneAttivaTesto = $(".player-season-changer .changebtn.pneo.active p").first().text().trim();
  const annoStagioneAttiva = Number(stagioneAttivaTesto.match(/(\d{4})/)?.[1]);

  interface VoceStagionePassata {
    stagione: string;
    annoInizio: number;
    totals: cheerio.Cheerio<any>;
  }
  const stagioniPassate: VoceStagionePassata[] = [];
  $("#past-section h5").each((_, el) => {
    const testo = $(el).text().trim();
    const m = testo.match(/(\d{4})\/(\d{4})\s*Season/i);
    if (!m) return;
    const totals = $(el).nextAll(".player_season_table").first().find(".totals").first();
    if (totals.length === 0) return;
    stagioniPassate.push({ stagione: `${m[1]}/${m[2]}`, annoInizio: Number(m[1]), totals });
  });

  // La sezione "Past Seasons" puo' elencare le stagioni fuori ordine (nel
  // campione reale una stagione 2026/2027 con una sola presenza appare prima
  // di 2024/2025): la vera "stagione precedente" e' quella con l'anno di
  // inizio piu' alto tra quelle STRETTAMENTE precedenti alla stagione attiva,
  // non semplicemente la prima del blocco.
  const candidatePrecedenti = Number.isFinite(annoStagioneAttiva)
    ? stagioniPassate.filter((s) => s.annoInizio < annoStagioneAttiva)
    : stagioniPassate;
  const precedente = candidatePrecedenti.sort((a, b) => b.annoInizio - a.annoInizio)[0];

  let presenze: number | undefined;
  let gol: number | undefined;
  let assist: number | undefined;
  let ammonizioni: number | undefined;
  let espulsioni: number | undefined;
  let minuti: number | undefined;

  if (precedente) {
    const celle = precedente.totals.children().toArray().map((el) => $(el).text().trim());
    // Ordine colonne nel campione: [Label, MP, Goals, Assists, Yellow, Red, Pen, Minutes].
    presenze = numeroPulito(celle[1]);
    gol = numeroPulito(celle[2]);
    assist = numeroPulito(celle[3]);
    ammonizioni = numeroPulito(celle[4]);
    espulsioni = numeroPulito(celle[5]);
    minuti = numeroPulito(celle[7]);
  }

  return {
    url,
    posizione,
    squadra,
    nazionaleSquadra,
    nazionalita,
    piede,
    eta,
    dataNascita,
    altezzaCm,
    pesoKg,
    stagione: precedente?.stagione,
    presenze,
    gol,
    assist,
    ammonizioni,
    espulsioni,
    minuti,
    aggiornatoIl: new Date().toISOString(),
  };
}
