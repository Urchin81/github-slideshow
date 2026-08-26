import * as cheerio from "cheerio";

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
  /** Nomi coinvolti in almeno un ballottaggio (entrambi/tutti i contendenti di ogni riga). */
  inBallottaggio: string[];
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

    const inBallottaggio = new Set<string>();
    $team.find(".guida-ballot-row a").each((_, a) => {
      // Il testo del link contiene anche la percentuale ("ZAPPACOSTA 55%"): va
      // rimosso il <strong> prima di leggere il testo, altrimenti il nome resta sporco.
      const nome = $(a).clone().children("strong").remove().end().text().replace(/\s+/g, " ").trim();
      if (nome) inBallottaggio.add(nome);
    });

    if (fuoriclasse.length > 0 || inBallottaggio.size > 0) {
      risultato.push({ squadra, fuoriclasse, inBallottaggio: Array.from(inBallottaggio) });
    }
  });

  return risultato;
}
