import { BallottaggioContendente, BallottaggioInfo, Player } from "./types";
import { trovaVoceGiocatoreInIndice } from "./indiceGiocatori";

/** Un contendente di un ballottaggio come scritto da FPEDIA (nome grezzo, non ancora risolto sul listino). */
export interface BallottaggioGiocatoreFpedia {
  nome: string;
  percentuale: number;
}

/** Un gruppo di ballottaggio (tutti i contendenti per lo stesso posto), come letto da FPEDIA. */
export interface BallottaggioGruppoFpedia {
  giocatori: BallottaggioGiocatoreFpedia[];
}

/**
 * Risolve i gruppi di ballottaggio grezzi di FPEDIA (nomi come scritti sul sito, es.
 * "L. BERNASCONI") sui giocatori del listino locale. Per ogni gruppo cerca quali
 * giocatori locali vi appartengono, riusando lo stesso matching per cognome già usato
 * per infortunati/fuoriclasse (`trovaVoceGiocatoreInIndice`): un contendente presente
 * su FPEDIA ma assente dal listino locale (es. una riserva non quotata) viene ignorato,
 * perché irrilevante per un'asta fantacalcio — per questo gli "avversari" risolti hanno
 * sempre un playerId valido, mai solo un nome. Un giocatore che risultasse in più
 * gruppi (dato imprevisto/errore FPEDIA) tiene il gruppo con più membri risolti.
 */
export function risolviBallottaggi(
  players: Player[],
  gruppi: BallottaggioGruppoFpedia[]
): Record<string, BallottaggioInfo> {
  const risultato: Record<string, BallottaggioInfo> = {};

  for (const gruppo of gruppi) {
    const membri = players
      .map((player) => ({ player, voce: trovaVoceGiocatoreInIndice(gruppo.giocatori, player.nome) }))
      .filter((m): m is { player: Player; voce: BallottaggioGiocatoreFpedia } => m.voce !== null);
    if (membri.length < 2) continue;

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
