import { Player, Ruolo } from "./types";

export interface ImportDiffEntry {
  id: string;
  nome: string;
  ruolo: Ruolo;
  campiCambiati: string[];
}

export interface ImportDiff {
  nuovi: Player[];
  aggiornati: ImportDiffEntry[];
  invariati: number;
  rimossi: Player[];
}

function mantraKey(ruoliMantra: Player["ruoliMantra"]): string {
  return (ruoliMantra ?? []).slice().sort().join(",");
}

/**
 * Confronta il listino gia' caricato con uno nuovo importato: aggiorna i campi
 * cambiati preservando stato/prezzo/notizie di ogni giocatore gia' tracciato,
 * aggiunge i giocatori nuovi e segnala quelli assenti nel nuovo file (da rimuovere).
 */
export function diffListino(existing: Player[], incoming: Player[]): { merged: Player[]; diff: ImportDiff } {
  const existingByKey = new Map(existing.map((p) => [p.id, p]));
  const incomingByKey = new Map(incoming.map((p) => [p.id, p]));

  const merged: Player[] = [];
  const nuovi: Player[] = [];
  const aggiornati: ImportDiffEntry[] = [];
  let invariati = 0;

  for (const inc of incoming) {
    const exist = existingByKey.get(inc.id);
    if (!exist) {
      nuovi.push(inc);
      merged.push(inc);
      continue;
    }

    const campiCambiati: string[] = [];
    if (exist.squadra !== inc.squadra) campiCambiati.push("squadra");
    if (exist.quotazione !== inc.quotazione) campiCambiati.push("quotazione");
    if ((exist.fvm ?? null) !== (inc.fvm ?? null)) campiCambiati.push("fvm");
    if (mantraKey(exist.ruoliMantra) !== mantraKey(inc.ruoliMantra)) campiCambiati.push("ruoliMantra");

    if (campiCambiati.length === 0) {
      invariati++;
      merged.push(exist);
    } else {
      merged.push({
        ...exist,
        squadra: inc.squadra,
        quotazione: inc.quotazione,
        fvm: inc.fvm,
        ruoliMantra: inc.ruoliMantra,
      });
      aggiornati.push({ id: exist.id, nome: exist.nome, ruolo: exist.ruolo, campiCambiati });
    }
  }

  const rimossi = existing.filter((p) => !incomingByKey.has(p.id));

  return { merged, diff: { nuovi, aggiornati, invariati, rimossi } };
}
