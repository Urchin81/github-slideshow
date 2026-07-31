import * as XLSX from "xlsx";
import { Player, Ruolo, RuoloMantra, playerKey } from "./types";

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

const ROLE_MANTRA_ALIASES: Record<string, RuoloMantra> = {
  POR: "Por",
  PO: "Por",
  DC: "Dc",
  DD: "Dd",
  DS: "Ds",
  B: "B",
  E: "E",
  M: "M",
  C: "C",
  W: "W",
  T: "T",
  A: "A",
  PC: "Pc",
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

function parseRuoliMantra(raw: string): RuoloMantra[] | undefined {
  const tokens = raw
    .split(/[;,/]/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  const ruoli = tokens.map((t) => ROLE_MANTRA_ALIASES[t]).filter((r): r is RuoloMantra => Boolean(r));
  return ruoli.length > 0 ? Array.from(new Set(ruoli)) : undefined;
}

/**
 * Parses the classic "listone" quotazioni Fantacalcio (xlsx or csv) into Player[].
 * Scans the first rows to find the header row (contains a "Nome" column), since
 * the official export has a title row above the real header. Legge anche la
 * colonna RM (ruoli Mantra) se presente, per supportare entrambe le modalita'.
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
  const idxRuoloMantra = findColumn(header, ["RM"]);
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
    const ruoliMantra =
      idxRuoloMantra !== -1 ? parseRuoliMantra(String(row[idxRuoloMantra] ?? "")) : undefined;

    players.push({
      id: playerKey(nome, ruolo),
      ruolo,
      ruoliMantra,
      nome,
      squadra,
      quotazione,
      fvm,
      stato: "disponibile",
    });
  }

  return players;
}
