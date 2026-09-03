import * as XLSX from "xlsx";
import { Player, Ruolo, RUOLI, RuoloMantra, RUOLI_MANTRA } from "./types";

export interface TitolareFormazione {
  nome: string;
  ruolo: Ruolo;
  ruoloMantra?: RuoloMantra;
}

/** Due o più giocatori in lotta per lo stesso posto: il primo di `candidati` è il favorito. */
export interface BallottaggioFormazione {
  ruolo: Ruolo;
  candidati: string[];
  nota?: string;
}

export interface FormazioneSquadra {
  squadra: string;
  modulo: string;
  titolari: TitolareFormazione[];
  ballottaggi: BallottaggioFormazione[];
  /** Rigoristi in ordine (il primo è il designato). */
  rigoristi: string[];
  /** Tiratori di punizione/calci piazzati in ordine (il primo è il designato). */
  calciPiazzati: string[];
}

const ROLE_SET = new Set<string>(RUOLI);
const ROLE_MANTRA_SET = new Set<string>(RUOLI_MANTRA);

function normalizeHeader(cell: unknown): string {
  return String(cell ?? "")
    .trim()
    .toUpperCase()
    .replace(/\./g, "");
}

function findColumn(header: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = header.findIndex((h) => h === candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Confronto tollerante ad accenti/maiuscole/spazi, usato sia per abbinare i rigoristi/calci
 * piazzati importati ai giocatori del listino, sia per riconoscere in "Probabili formazioni"
 * chi è già stato acquistato. */
export function normalizzaNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

const COLONNE_CSV = [
  "Squadra",
  "Modulo",
  "Ruolo",
  "RuoloMantra",
  "Nome",
  "Titolare",
  "GruppoBallottaggio",
  "Ordine",
  "OrdineRigorista",
  "OrdineCalciPiazzati",
  "Nota",
] as const;
const [IDX_SQUADRA, IDX_MODULO, IDX_RUOLO, IDX_RUOLO_MANTRA, IDX_NOME, IDX_TITOLARE, IDX_GRUPPO, IDX_ORDINE, IDX_ORDINE_RIGORISTA, IDX_ORDINE_CALCI_PIAZZATI, IDX_NOTA] = COLONNE_CSV.map(
  (_, i) => i
);

function csvEscape(value: string): string {
  if (value === "") return "";
  if (/[",\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function rigaVuota(squadra: string, modulo: string, nome: string): string[] {
  const riga = new Array(COLONNE_CSV.length).fill("");
  riga[IDX_SQUADRA] = squadra;
  riga[IDX_MODULO] = modulo;
  riga[IDX_NOME] = nome;
  riga[IDX_TITOLARE] = "NO";
  return riga;
}

/**
 * Serializza le formazioni in CSV: una riga per ogni titolare, per ogni candidato di un
 * ballottaggio e (se non già coperto da una di quelle) per ogni rigorista/tiratore di calci
 * piazzati — le colonne OrdineRigorista/OrdineCalciPiazzati si appoggiano alla prima riga
 * disponibile per quel nome, o ne creano una apposta (con Ruolo vuoto) se il giocatore non è
 * né titolare né in un ballottaggio.
 */
export function serializzaFormazioniCsv(formazioni: FormazioneSquadra[]): string {
  const righe: string[][] = [[...COLONNE_CSV]];

  for (const f of formazioni) {
    const righeSquadra: string[][] = [];
    const rigaPerNome = new Map<string, string[]>();
    function emetti(riga: string[]) {
      righeSquadra.push(riga);
      if (!rigaPerNome.has(riga[IDX_NOME])) rigaPerNome.set(riga[IDX_NOME], riga);
    }

    for (const t of f.titolari) {
      const riga = rigaVuota(f.squadra, f.modulo, t.nome);
      riga[IDX_RUOLO] = t.ruolo;
      riga[IDX_RUOLO_MANTRA] = t.ruoloMantra ?? "";
      riga[IDX_TITOLARE] = "SI";
      emetti(riga);
    }
    f.ballottaggi.forEach((b, i) => {
      const gruppo = `${f.squadra}-B${i + 1}`;
      b.candidati.forEach((nome, ordine) => {
        const riga = rigaVuota(f.squadra, f.modulo, nome);
        riga[IDX_RUOLO] = b.ruolo;
        riga[IDX_GRUPPO] = gruppo;
        riga[IDX_ORDINE] = String(ordine + 1);
        riga[IDX_NOTA] = b.nota ?? "";
        emetti(riga);
      });
    });

    function assegnaOrdine(nomi: string[], colonna: number) {
      nomi.slice(0, 3).forEach((nome, i) => {
        const riga = rigaPerNome.get(nome) ?? rigaVuota(f.squadra, f.modulo, nome);
        riga[colonna] = String(i + 1);
        if (!rigaPerNome.has(nome)) emetti(riga);
      });
    }
    assegnaOrdine(f.rigoristi, IDX_ORDINE_RIGORISTA);
    assegnaOrdine(f.calciPiazzati, IDX_ORDINE_CALCI_PIAZZATI);

    righe.push(...righeSquadra);
  }

  // BOM UTF-8 iniziale: senza, Excel e la stessa libreria xlsx in lettura interpretano il
  // file come Latin-1, corrompendo nomi con accenti (es. "Soulè" -> "SoulÃ¨") al reimport.
  return "﻿" + righe.map((r) => r.map(csvEscape).join(",")).join("\n") + "\n";
}

/** File .xlsx/.xls veri iniziano con la firma ZIP "PK" o quella OLE compound: un CSV testuale no. */
function isFileZipXlsx(fileBuffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(fileBuffer.slice(0, 4));
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"
  const isOle = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
  return isZip || isOle;
}

function leggiRigheXlsx(fileBuffer: ArrayBuffer): unknown[][] {
  const workbook = XLSX.read(fileBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
}

/**
 * Parser CSV manuale (RFC4180: virgolette, virgole/newline nei campi) invece di appoggiarsi
 * a XLSX.read per il testo: quella via interpreta come date campi tipo "4-3-3" o "3-5-2"
 * (3 numeri separati da trattino = pattern data) trasformandoli in numeri seriali Excel
 * (es. "37714"), corrompendo silenziosamente la colonna Modulo.
 */
function leggiRigheCsvTestuale(fileBuffer: ArrayBuffer): string[][] {
  let testo = new TextDecoder("utf-8").decode(fileBuffer);
  if (testo.charCodeAt(0) === 0xfeff) testo = testo.slice(1);

  const righe: string[][] = [];
  let riga: string[] = [];
  let campo = "";
  let dentroVirgolette = false;
  for (let i = 0; i < testo.length; i++) {
    const c = testo[i];
    if (dentroVirgolette) {
      if (c === '"') {
        if (testo[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroVirgolette = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      dentroVirgolette = true;
    } else if (c === ",") {
      riga.push(campo);
      campo = "";
    } else if (c === "\n") {
      riga.push(campo);
      righe.push(riga);
      riga = [];
      campo = "";
    } else if (c === "\r") {
      // ignorato, il "\n" che segue chiude comunque la riga
    } else {
      campo += c;
    }
  }
  if (campo.length > 0 || riga.length > 0) {
    riga.push(campo);
    righe.push(riga);
  }
  return righe.filter((r) => !(r.length === 1 && r[0] === ""));
}

interface Riga {
  squadra: string;
  modulo: string;
  ruolo?: Ruolo;
  ruoloMantra?: RuoloMantra;
  nome: string;
  titolare: boolean;
  gruppo: string;
  ordine: number;
  ordineRigorista?: number;
  ordineCalciPiazzati?: number;
  nota: string;
}

/**
 * Legge un CSV (o xlsx con le stesse colonne) di formazioni/ballottaggi/rigoristi/calci
 * piazzati e lo trasforma in FormazioneSquadra[]. Formato: una riga per titolare (Titolare=SI),
 * per candidato di un ballottaggio (Titolare=NO, con GruppoBallottaggio/Ordine a raggruppare e
 * ordinare i contendenti dello stesso posto) e/o per rigorista/tiratore di calci piazzati
 * (colonne OrdineRigorista/OrdineCalciPiazzati, che possono comparire su una riga già usata per
 * titolare/ballottaggio oppure su una riga a sé, con Ruolo vuoto) — vedi serializzaFormazioniCsv
 * per lo schema completo.
 */
export function parseFormazioniCsv(fileBuffer: ArrayBuffer): FormazioneSquadra[] {
  const rows: unknown[][] = isFileZipXlsx(fileBuffer) ? leggiRigheXlsx(fileBuffer) : leggiRigheCsvTestuale(fileBuffer);

  if (rows.length === 0) return [];
  const header = rows[0].map(normalizeHeader);

  const idxSquadra = findColumn(header, ["SQUADRA"]);
  const idxModulo = findColumn(header, ["MODULO"]);
  const idxRuolo = findColumn(header, ["RUOLO"]);
  const idxRuoloMantra = findColumn(header, ["RUOLOMANTRA", "RM"]);
  const idxNome = findColumn(header, ["NOME"]);
  const idxTitolare = findColumn(header, ["TITOLARE"]);
  const idxGruppo = findColumn(header, ["GRUPPOBALLOTTAGGIO"]);
  const idxOrdine = findColumn(header, ["ORDINE"]);
  const idxOrdineRigorista = findColumn(header, ["ORDINERIGORISTA"]);
  const idxOrdineCalciPiazzati = findColumn(header, ["ORDINECALCIPIAZZATI"]);
  const idxNota = findColumn(header, ["NOTA"]);

  if (idxSquadra === -1 || idxNome === -1) {
    throw new Error("Il CSV deve contenere almeno le colonne Squadra e Nome.");
  }

  const righe: Riga[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const nome = String(row[idxNome] ?? "").trim();
    const squadra = String(row[idxSquadra] ?? "").trim();
    if (!nome || !squadra) continue;

    const rawRuolo = idxRuolo !== -1 ? String(row[idxRuolo] ?? "").trim().toUpperCase() : "";
    const ruolo = ROLE_SET.has(rawRuolo) ? (rawRuolo as Ruolo) : undefined;

    const rawRuoloMantra = idxRuoloMantra !== -1 ? String(row[idxRuoloMantra] ?? "").trim() : "";
    const ruoloMantra = ROLE_MANTRA_SET.has(rawRuoloMantra) ? (rawRuoloMantra as RuoloMantra) : undefined;

    const titolare = idxTitolare !== -1 ? String(row[idxTitolare] ?? "").trim().toUpperCase() === "SI" : true;
    const gruppo = idxGruppo !== -1 ? String(row[idxGruppo] ?? "").trim() : "";
    const ordine = idxOrdine !== -1 ? Number(row[idxOrdine]) || 0 : 0;
    const ordineRigorista = idxOrdineRigorista !== -1 ? Number(row[idxOrdineRigorista]) || undefined : undefined;
    const ordineCalciPiazzati =
      idxOrdineCalciPiazzati !== -1 ? Number(row[idxOrdineCalciPiazzati]) || undefined : undefined;
    const nota = idxNota !== -1 ? String(row[idxNota] ?? "").trim() : "";
    const modulo = idxModulo !== -1 ? String(row[idxModulo] ?? "").trim() : "";

    righe.push({ squadra, modulo, ruolo, ruoloMantra, nome, titolare, gruppo, ordine, ordineRigorista, ordineCalciPiazzati, nota });
  }

  const squadreOrdine: string[] = [];
  const perSquadra = new Map<string, Riga[]>();
  for (const r of righe) {
    if (!perSquadra.has(r.squadra)) {
      perSquadra.set(r.squadra, []);
      squadreOrdine.push(r.squadra);
    }
    perSquadra.get(r.squadra)!.push(r);
  }

  return squadreOrdine.map((squadra) => {
    const righeSquadra = perSquadra.get(squadra)!;
    const modulo = righeSquadra.find((r) => r.modulo)?.modulo ?? "";

    const titolari: TitolareFormazione[] = righeSquadra
      .filter((r) => r.titolare && r.ruolo)
      .map((r) => ({ nome: r.nome, ruolo: r.ruolo as Ruolo, ruoloMantra: r.ruoloMantra }));

    const gruppiBallottaggio = new Map<string, Riga[]>();
    for (const r of righeSquadra) {
      if (!r.gruppo) continue;
      if (!gruppiBallottaggio.has(r.gruppo)) gruppiBallottaggio.set(r.gruppo, []);
      gruppiBallottaggio.get(r.gruppo)!.push(r);
    }
    const ballottaggi: BallottaggioFormazione[] = Array.from(gruppiBallottaggio.values()).map((membri) => {
      const ordinati = [...membri].sort((a, b) => a.ordine - b.ordine);
      return {
        ruolo: ordinati.find((m) => m.ruolo)?.ruolo ?? "C",
        candidati: ordinati.map((m) => m.nome),
        nota: ordinati.find((m) => m.nota)?.nota,
      };
    });

    const rigoristi = righeSquadra
      .filter((r) => r.ordineRigorista)
      .sort((a, b) => a.ordineRigorista! - b.ordineRigorista!)
      .map((r) => r.nome);
    const calciPiazzati = righeSquadra
      .filter((r) => r.ordineCalciPiazzati)
      .sort((a, b) => a.ordineCalciPiazzati! - b.ordineCalciPiazzati!)
      .map((r) => r.nome);

    return { squadra, modulo, titolari, ballottaggi, rigoristi, calciPiazzati };
  });
}

/**
 * Confronta i rigoristi/calci piazzati delle formazioni importate con i giocatori del listino
 * (per nome, tollerante ad accenti/maiuscole) e prepara gli aggiornamenti da applicare con
 * l'azione generica dello store che patcha i giocatori per id (es. applyNewsResults). Azzera
 * esplicitamente ordineRigorista/ordineCalciPiazzati per chi non è più (o non era) nella lista,
 * così un reimport con un ordine cambiato non lascia medagliette vecchie appese.
 */
export function abbinaOrdiniSpecialisti(
  players: Player[],
  formazioni: FormazioneSquadra[]
): Record<string, Partial<Player>> {
  const mappa = new Map<string, { ordineRigorista?: 1 | 2 | 3; ordineCalciPiazzati?: 1 | 2 | 3 }>();
  for (const f of formazioni) {
    f.rigoristi.slice(0, 3).forEach((nome, i) => {
      const chiave = normalizzaNome(nome);
      mappa.set(chiave, { ...mappa.get(chiave), ordineRigorista: (i + 1) as 1 | 2 | 3 });
    });
    f.calciPiazzati.slice(0, 3).forEach((nome, i) => {
      const chiave = normalizzaNome(nome);
      mappa.set(chiave, { ...mappa.get(chiave), ordineCalciPiazzati: (i + 1) as 1 | 2 | 3 });
    });
  }

  const updates: Record<string, Partial<Player>> = {};
  for (const p of players) {
    const voce = mappa.get(normalizzaNome(p.nome));
    const nuovoRigorista = voce?.ordineRigorista;
    const nuovoCalciPiazzati = voce?.ordineCalciPiazzati;
    if (nuovoRigorista !== p.ordineRigorista || nuovoCalciPiazzati !== p.ordineCalciPiazzati) {
      updates[p.id] = { ordineRigorista: nuovoRigorista, ordineCalciPiazzati: nuovoCalciPiazzati };
    }
  }
  return updates;
}
