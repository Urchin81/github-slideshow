import { BallottaggioContendente, BallottaggioInfo, normalizeText, Player } from "./types";
import { trovaVoceGiocatoreInIndice } from "./indiceGiocatori";

/** Un contendente di un ballottaggio come scritto da FPEDIA (nome grezzo, non ancora risolto sul listino). */
export interface BallottaggioGiocatoreFpedia {
  nome: string;
  percentuale: number;
}

/** Un gruppo di ballottaggio (tutti i contendenti per lo stesso posto), come letto da FPEDIA. */
export interface BallottaggioGruppoFpedia {
  /** Slug/nome della squadra a cui appartiene il gruppo (es. "inter"), per evitare match tra squadre diverse. */
  squadra: string;
  giocatori: BallottaggioGiocatoreFpedia[];
}

/** Vero se lo slug squadra di FPEDIA e la squadra del listino locale sembrano la stessa. */
function stessaSquadra(slugFpedia: string, squadraListino: string): boolean {
  const a = normalizeText(slugFpedia);
  const b = normalizeText(squadraListino);
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Risolve i gruppi di ballottaggio grezzi di FPEDIA (nomi come scritti sul sito, es.
 * "L. BERNASCONI") sui giocatori del listino locale. Per ogni gruppo cerca quali
 * giocatori locali vi appartengono, riusando lo stesso matching per cognome già usato
 * per infortunati/fuoriclasse (`trovaVoceGiocatoreInIndice`) — ma un match per cognome
 * da solo non basta: cognomi brevi o comuni (es. "Martin") possono essere sottostringa
 * di un cognome più lungo e non imparentato (es. "Martinez"), e due giocatori con lo
 * stesso identico cognome ma ruoli opposti (es. un portiere e un attaccante, entrambi
 * "Martinez") non possono davvero essere in ballottaggio per lo stesso posto. Si
 * richiede quindi anche la STESSA squadra del gruppo e — tra i candidati sopravvissuti —
 * si tiene solo il gruppetto più numeroso con lo stesso ruolo Classic (P/D/C/A, sempre
 * presente su ogni giocatore a prescindere dalla modalità): gli altri sono scartati come
 * falsi positivi di matching sul nome. Un contendente presente su FPEDIA ma assente dal
 * listino locale (es. una riserva non quotata) viene ignorato, perché irrilevante per
 * un'asta fantacalcio — per questo gli "avversari" risolti hanno sempre un playerId
 * valido, mai solo un nome. Un giocatore che risultasse in più gruppi (dato
 * imprevisto/errore FPEDIA) tiene il gruppo con più membri risolti.
 */
export function risolviBallottaggi(
  players: Player[],
  gruppi: BallottaggioGruppoFpedia[]
): Record<string, BallottaggioInfo> {
  const risultato: Record<string, BallottaggioInfo> = {};

  for (const gruppo of gruppi) {
    const candidati = players
      .filter((player) => stessaSquadra(gruppo.squadra, player.squadra))
      .map((player) => ({ player, voce: trovaVoceGiocatoreInIndice(gruppo.giocatori, player.nome) }))
      .filter((m): m is { player: Player; voce: BallottaggioGiocatoreFpedia } => m.voce !== null);
    if (candidati.length < 2) continue;

    // Tiene solo il gruppetto più numeroso con lo stesso ruolo Classic: un ballottaggio
    // vero è sempre per un unico posto, quindi ruoli diversi tra i candidati indicano
    // quasi certamente due giocatori diversi confusi dal matching sul cognome.
    const perRuolo = new Map<string, typeof candidati>();
    for (const c of candidati) {
      const lista = perRuolo.get(c.player.ruolo) ?? [];
      lista.push(c);
      perRuolo.set(c.player.ruolo, lista);
    }
    const membri = [...perRuolo.values()].sort((a, b) => b.length - a.length)[0];
    if (!membri || membri.length < 2) continue;

    for (const membro of membri) {
      const avversari: BallottaggioContendente[] = membri
        .filter((m) => m.player.id !== membro.player.id)
        .map((m) => ({ playerId: m.player.id, nome: m.player.nome, percentuale: m.voce.percentuale }));
      const esistente = risultato[membro.player.id];
      if (!esistente || esistente.avversari.length < avversari.length) {
        risultato[membro.player.id] = { percentuale: membro.voce.percentuale, avversari };
      }
    }
  }

  return risultato;
}
