import { normalizeText, scomponiNomeListino } from "./types";

export interface VoceIndiceGiocatore {
  nome: string;
  url: string;
}

/**
 * Trova nell'indice l'URL del giocatore cercato. Il listino ha solo il
 * cognome (con l'iniziale del nome se serve a distinguere omonimi, es.
 * "Adekunle A."), mentre l'indice ha nome completo: richiede che TUTTE le
 * parole del cognome compaiano nel nome candidato (l'indice contiene tutti
 * i giocatori del campionato, quindi niente match parziali per evitare falsi
 * positivi), e se più giocatori condividono lo stesso cognome usa l'iniziale
 * per scegliere quello giusto. Usata sia per FPEDIA che per FSTATS: stesso
 * listino, stessa convenzione di nomi da riconciliare con siti terzi.
 */
export function trovaUrlGiocatoreInIndice(
  indice: VoceIndiceGiocatore[],
  nomeCercato: string,
  baseUrl: string
): string | null {
  const { cognome, iniziale } = scomponiNomeListino(nomeCercato);
  const cognomeParti = normalizeText(cognome).split(/\s+/).filter(Boolean);
  if (cognomeParti.length === 0) return null;

  const conCognome = indice.filter((voce) => {
    const normalizzato = normalizeText(voce.nome);
    return cognomeParti.every((parte) => normalizzato.includes(parte));
  });
  if (conCognome.length === 0) return null;

  if (iniziale && conCognome.length > 1) {
    const inizialeNorm = normalizeText(iniziale);
    const conIniziale = conCognome.filter((voce) => {
      const partiNome = normalizeText(voce.nome).split(/\s+/).filter(Boolean);
      const restanti = partiNome.filter((p) => !cognomeParti.some((c) => p === c || p.includes(c)));
      return restanti.some((p) => p.startsWith(inizialeNorm));
    });
    if (conIniziale.length > 0) return new URL(conIniziale[0].url, baseUrl).toString();
  }

  return new URL(conCognome[0].url, baseUrl).toString();
}
