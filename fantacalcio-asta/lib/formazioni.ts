import * as XLSX from "xlsx";
import { Ruolo, RUOLI, RuoloMantra, RUOLI_MANTRA } from "./types";

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

const INTESTAZIONE_CSV = [
  "Squadra",
  "Modulo",
  "Ruolo",
  "RuoloMantra",
  "Nome",
  "Titolare",
  "GruppoBallottaggio",
  "Ordine",
  "Nota",
];

function csvEscape(value: string): string {
  if (value === "") return "";
  if (/[",\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Serializza le formazioni in CSV: una riga per ogni titolare e per ogni candidato di un ballottaggio. */
export function serializzaFormazioniCsv(formazioni: FormazioneSquadra[]): string {
  const righe: string[][] = [INTESTAZIONE_CSV];

  for (const f of formazioni) {
    for (const t of f.titolari) {
      righe.push([f.squadra, f.modulo, t.ruolo, t.ruoloMantra ?? "", t.nome, "SI", "", "", ""]);
    }
    f.ballottaggi.forEach((b, i) => {
      const gruppo = `${f.squadra}-B${i + 1}`;
      b.candidati.forEach((nome, ordine) => {
        righe.push([f.squadra, f.modulo, b.ruolo, "", nome, "NO", gruppo, String(ordine + 1), b.nota ?? ""]);
      });
    });
  }

  // BOM UTF-8 iniziale: senza, Excel e la stessa libreria xlsx in lettura interpretano il
  // file come Latin-1, corrompendo nomi con accenti (es. "Soulè" -> "SoulÃ¨") al reimport.
  return "﻿" + righe.map((r) => r.map(csvEscape).join(",")).join("\n") + "\n";
}

/**
 * Legge un CSV (o xlsx con le stesse colonne) di formazioni/ballottaggi e lo trasforma in
 * FormazioneSquadra[]. Formato: una riga per titolare (Titolare=SI) o per candidato di un
 * ballottaggio (Titolare=NO, con GruppoBallottaggio e Ordine a raggruppare/ordinare i
 * contendenti dello stesso posto — vedi serializzaFormazioniCsv per lo schema completo).
 */
export function parseFormazioniCsv(fileBuffer: ArrayBuffer): FormazioneSquadra[] {
  const workbook = XLSX.read(fileBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });

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
  const idxNota = findColumn(header, ["NOTA"]);

  if (idxSquadra === -1 || idxRuolo === -1 || idxNome === -1) {
    throw new Error("Il CSV deve contenere almeno le colonne Squadra, Ruolo e Nome.");
  }

  interface Riga {
    squadra: string;
    modulo: string;
    ruolo: Ruolo;
    ruoloMantra?: RuoloMantra;
    nome: string;
    titolare: boolean;
    gruppo: string;
    ordine: number;
    nota: string;
  }

  const righe: Riga[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const nome = String(row[idxNome] ?? "").trim();
    const squadra = String(row[idxSquadra] ?? "").trim();
    if (!nome || !squadra) continue;

    const rawRuolo = String(row[idxRuolo] ?? "").trim().toUpperCase();
    if (!ROLE_SET.has(rawRuolo)) continue;
    const ruolo = rawRuolo as Ruolo;

    const rawRuoloMantra = idxRuoloMantra !== -1 ? String(row[idxRuoloMantra] ?? "").trim() : "";
    const ruoloMantra = ROLE_MANTRA_SET.has(rawRuoloMantra) ? (rawRuoloMantra as RuoloMantra) : undefined;

    const titolare = idxTitolare !== -1 ? String(row[idxTitolare] ?? "").trim().toUpperCase() === "SI" : true;
    const gruppo = idxGruppo !== -1 ? String(row[idxGruppo] ?? "").trim() : "";
    const ordine = idxOrdine !== -1 ? Number(row[idxOrdine]) || 0 : 0;
    const nota = idxNota !== -1 ? String(row[idxNota] ?? "").trim() : "";
    const modulo = idxModulo !== -1 ? String(row[idxModulo] ?? "").trim() : "";

    righe.push({ squadra, modulo, ruolo, ruoloMantra, nome, titolare, gruppo, ordine, nota });
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
      .filter((r) => r.titolare)
      .map((r) => ({ nome: r.nome, ruolo: r.ruolo, ruoloMantra: r.ruoloMantra }));

    const gruppiBallottaggio = new Map<string, Riga[]>();
    for (const r of righeSquadra) {
      if (!r.gruppo) continue;
      if (!gruppiBallottaggio.has(r.gruppo)) gruppiBallottaggio.set(r.gruppo, []);
      gruppiBallottaggio.get(r.gruppo)!.push(r);
    }
    const ballottaggi: BallottaggioFormazione[] = Array.from(gruppiBallottaggio.values()).map((membri) => {
      const ordinati = [...membri].sort((a, b) => a.ordine - b.ordine);
      return {
        ruolo: ordinati[0].ruolo,
        candidati: ordinati.map((m) => m.nome),
        nota: ordinati.find((m) => m.nota)?.nota,
      };
    });

    return { squadra, modulo, titolari, ballottaggi };
  });
}
