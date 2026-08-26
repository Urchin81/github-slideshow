import * as cheerio from "cheerio";
import { BallottaggioGruppoFpedia } from "./ballottaggioResolve";

/**
 * Ballottaggi e tag "Fuoriclasse" per squadra, dalla pagina guida-asta di FPEDIA
 * (una singola pagina con tutte le squadre di Serie A, una <section class="guida-team">
 * per squadra). Struttura confermata su un campione HTML reale incollato dall'utente
 * (lib/__fixtures__/fpedia-guida-asta-sample.html) — architettura diversa dalla scheda
 * individuale già letta da lib/fpedia.ts, quindi un parser dedicato invece di
 * un'estensione di quello.
 */
export interface BallottaggioSquadra {
  /** Slug della squadra (attributo data-team/id della section, es. "atalanta"). */
  squadra: string;
  /** Nomi (come scritti da FPEDIA, in maiuscolo) con il tag "Fuoriclasse" nella rosa. */
  fuoriclasse: string[];
  /** Gruppi di ballottaggio (ogni riga = tutti i contendenti per lo stesso posto, con percentuale). */
  ballottaggi: BallottaggioGruppoFpedia[];
}

export function parseFpediaGuidaAsta(html: string): BallottaggioSquadra[] {
  const $ = cheerio.load(html);
  const risultato: BallottaggioSquadra[] = [];

  $("section.guida-team").each((_, teamEl) => {
    const $team = $(teamEl);
    const squadra = $team.attr("data-team") ?? $team.attr("id") ?? "";
    if (!squadra) return;

    const fuoriclasse: string[] = [];
    $team.find(".guida-panel-rosa .guida-player-item").each((_, li) => {
      const $li = $(li);
      if ($li.find('img[alt="Fuoriclasse"]').length === 0) return;
      const nome = $li.find(".guida-player-main strong").first().text().replace(/\s+/g, " ").trim();
      if (nome) fuoriclasse.push(nome);
    });

    const ballottaggi: BallottaggioGruppoFpedia[] = [];
    $team.find(".guida-ballot-row").each((_, row) => {
      const giocatori: BallottaggioGruppoFpedia["giocatori"] = [];
      $(row)
        .find("a")
        .each((_, a) => {
          const $a = $(a);
          // Il testo del link contiene anche la percentuale ("ZAPPACOSTA 55%"): va
          // rimosso il <strong> prima di leggere il nome, altrimenti resta sporco.
          const percentualeTesto = $a.find("strong").first().text();
          const percentuale = parseInt(percentualeTesto, 10);
          const nome = $a.clone().children("strong").remove().end().text().replace(/\s+/g, " ").trim();
          if (nome && Number.isFinite(percentuale)) giocatori.push({ nome, percentuale });
        });
      if (giocatori.length >= 2) ballottaggi.push({ giocatori });
    });

    if (fuoriclasse.length > 0 || ballottaggi.length > 0) {
      risultato.push({ squadra, fuoriclasse, ballottaggi });
    }
  });

  return risultato;
}
