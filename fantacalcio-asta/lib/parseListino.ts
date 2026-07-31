import * as XLSX from "xlsx";
import { Player, Ruolo } from "./types";

const ROLE_ALIASES: Record<string, Ruolo> = {
  P: "P",
  POR: "P",
  PORTIERE: "P",
  D: "D",
  DIF: "D",
  DIFENSORE: "D",
  C: "C",
  CEN: "C",
  CENTROCAMPISTA: "C",
  A: "A",
  ATT: "A",
  ATTACCANTE: "A",
};

function normalizeHeader(cell: unknown): string {
  return String(cell ?? "")
    .trim()
    .toUpperCase();
}

function findColumn(header: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = header.findIndex((h) => h === candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parses the classic "listone" quotazioni Fantacalcio (xlsx or csv) into Player[].
 * Scans the first rows to find the header row (contains a "Nome" column), since
 * the official export has a title row above the real header.
 */
export function parseListino(fileBuffer: ArrayBuffer): Player[] {
  const workbook = XLSX.read(fileBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: "",
  });

  let headerRowIndex = -1;
  let header: string[] = [];
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const candidate = rows[i].map(normalizeHeader);
    if (candidate.some((c) => c === "NOME")) {
      header = candidate;
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(
      "Impossibile trovare l'intestazione del listino (colonna 'Nome' non trovata)."
    );
  }

  const idxRuolo = findColumn(header, ["R", "RUOLO"]);
  const idxNome = findColumn(header, ["NOME"]);
  const idxSquadra = findColumn(header, ["SQUADRA"]);
  const idxQuotazione = findColumn(header, ["QT.A", "QTA", "QUOTAZIONE"]);
  const idxFvm = findColumn(header, ["FVM", "FVM M"]);

  if (idxRuolo === -1 || idxNome === -1 || idxQuotazione === -1) {
    throw new Error(
      "Il listino deve contenere almeno le colonne Ruolo (R), Nome e Quotazione (Qt.A)."
    );
  }

  const players: Player[] = [];
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const nome = String(row[idxNome] ?? "").trim();
    if (!nome) continue;

    const rawRuolo = String(row[idxRuolo] ?? "")
      .trim()
      .toUpperCase();
    const ruolo = ROLE_ALIASES[rawRuolo];
    if (!ruolo) continue;

    const quotazione = Number(row[idxQuotazione]) || 0;
    const squadra = idxSquadra !== -1 ? String(row[idxSquadra] ?? "").trim() : "";
    const fvm = idxFvm !== -1 ? Number(row[idxFvm]) || undefined : undefined;

    players.push({
      id: `${nome}-${squadra}-${i}`,
      ruolo,
      nome,
      squadra,
      quotazione,
      fvm,
      stato: "disponibile",
    });
  }

  return players;
}
