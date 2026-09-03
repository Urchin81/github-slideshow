import { findColumn, leggiRigheFile, normalizeHeader } from "./csv";
import { trovaVoceGiocatoreInIndice } from "./indiceGiocatori";
import { Player } from "./types";

// Ordine/colore delle fasce sono in lib/fasceConsigli.ts (nessuna dipendenza da xlsx): i
// componenti che devono solo mostrare una fascia importano da lì direttamente, non da qui, per
// non trascinarsi dentro il parser di questo file (e con esso l'intera libreria xlsx) in pagine
// che non ne hanno bisogno.

export interface VoceConsigli {
  nome: string;
  fascia: string;
  commento?: string;
}

// Il matcher condiviso (scomponiNomeListino) riconosce l'iniziale degli omonimi solo nel formato
// a una lettera del listino ufficiale ("Cognome A."), ma questo CSV a volte ne usa più di una
// ("Martinez Jo.", "Ederson D.S."): senza normalizzazione quelle righe non troverebbero mai un
// match, perché l'intera stringa (punto compreso) verrebbe trattata come cognome letterale. Il
// suffisso puntato finale, se presente, viene troncato qui alla sola prima lettera prima di
// cercare il giocatore — basta quella per la disambiguazione, e riduce tutto al formato standard.
const SUFFISSO_INIZIALE_REGEX = /\s+([A-Za-z])[A-Za-z.]*\.$/;
function troncaIniziale(nome: string): string {
  return nome.replace(SUFFISSO_INIZIALE_REGEX, " $1.");
}

/**
 * Legge un CSV (delimitatore ";", come i tipici export CSV in locale italiana) o xlsx con le
 * colonne Giocatore, Fascia e (opzionale) Commento — la colonna Ruolo, se presente, è ignorata:
 * l'abbinamento ai giocatori del listino avviene solo per nome (vedi abbinaConsigli).
 */
export function parseConsigliCsv(fileBuffer: ArrayBuffer): VoceConsigli[] {
  const rows = leggiRigheFile(fileBuffer, ";");
  if (rows.length === 0) return [];
  const header = rows[0].map(normalizeHeader);

  const idxNome = findColumn(header, ["GIOCATORE", "NOME"]);
  const idxFascia = findColumn(header, ["FASCIA"]);
  const idxCommento = findColumn(header, ["COMMENTO", "NOTA", "NOTE"]);

  if (idxNome === -1 || idxFascia === -1) {
    throw new Error("Il CSV deve contenere almeno le colonne Giocatore e Fascia.");
  }

  const voci: VoceConsigli[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const nome = String(row[idxNome] ?? "").trim();
    const fascia = String(row[idxFascia] ?? "").trim();
    if (!nome || !fascia) continue;
    const commento = idxCommento !== -1 ? String(row[idxCommento] ?? "").trim() || undefined : undefined;
    voci.push({ nome, fascia, commento });
  }
  return voci;
}

/**
 * Abbina le voci importate ai giocatori del listino per nome — stesso matcher "cognome (+
 * iniziale per gli omonimi)" già usato per FPEDIA/infortunati (trovaVoceGiocatoreInIndice),
 * dato che sia questo CSV sia il listino abbreviano allo stesso modo (es. "Martinez Jo.",
 * "Adekunle A.") — e prepara gli aggiornamenti da applicare con l'azione generica dello store
 * che patcha i giocatori per id (es. applyNewsResults). Azzera fascia/commento per chi non è più
 * (o non era) nel CSV, così un reimport aggiornato non lascia dati vecchi appesi.
 */
export function abbinaConsigli(players: Player[], voci: VoceConsigli[]): Record<string, Partial<Player>> {
  const indice = players.map((p) => ({ nome: p.nome, id: p.id }));
  const trovatiId = new Set<string>();
  const datiPerId = new Map<string, { fascia: string; commento?: string }>();

  for (const voce of voci) {
    const match = trovaVoceGiocatoreInIndice(indice, troncaIniziale(voce.nome));
    if (!match) continue;
    trovatiId.add(match.id);
    datiPerId.set(match.id, { fascia: voce.fascia, commento: voce.commento });
  }

  const updates: Record<string, Partial<Player>> = {};
  for (const p of players) {
    const dati = datiPerId.get(p.id);
    const nuovaFascia = dati?.fascia;
    const nuovoCommento = dati?.commento;
    if (nuovaFascia !== p.fasciaConsigli || nuovoCommento !== p.commentoConsigli) {
      updates[p.id] = { fasciaConsigli: nuovaFascia, commentoConsigli: nuovoCommento };
    }
  }
  return updates;
}
