import * as XLSX from "xlsx";

/** File .xlsx/.xls veri iniziano con la firma ZIP "PK" o quella OLE compound: un CSV testuale no. */
export function isFileZipXlsx(fileBuffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(fileBuffer.slice(0, 4));
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"
  const isOle = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
  return isZip || isOle;
}

export function leggiRigheXlsx(fileBuffer: ArrayBuffer): unknown[][] {
  const workbook = XLSX.read(fileBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
}

/**
 * Parser CSV manuale (RFC4180: virgolette, delimitatore configurabile, delimitatore/newline nei
 * campi tra virgolette) invece di appoggiarsi a XLSX.read per il testo: quella via interpreta
 * come date campi tipo "4-3-3" o "3-5-2" (numeri separati da trattino = pattern data)
 * trasformandoli in numeri seriali Excel (es. "37714"), corrompendo silenziosamente colonne che
 * assomigliano a una data.
 */
export function leggiRigheCsvTestuale(fileBuffer: ArrayBuffer, delimitatore = ","): string[][] {
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
    } else if (c === delimitatore) {
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

/** Legge un file (xlsx/xls veri via XLSX, altrimenti testo CSV col parser manuale) in righe di celle. */
export function leggiRigheFile(fileBuffer: ArrayBuffer, delimitatoreCsv = ","): unknown[][] {
  return isFileZipXlsx(fileBuffer) ? leggiRigheXlsx(fileBuffer) : leggiRigheCsvTestuale(fileBuffer, delimitatoreCsv);
}

export function normalizeHeader(cell: unknown): string {
  return String(cell ?? "")
    .trim()
    .toUpperCase()
    .replace(/\./g, "");
}

export function findColumn(header: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = header.findIndex((h) => h === candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

function csvEscape(value: string): string {
  if (value === "") return "";
  if (/[",\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Serializza righe in CSV con BOM UTF-8 iniziale: senza, Excel e la stessa libreria xlsx in
 * lettura interpretano il file come Latin-1, corrompendo nomi con accenti (es. "Soulè" -> "SoulÃ¨"). */
export function serializzaCsv(righe: string[][], delimitatore = ","): string {
  return "﻿" + righe.map((r) => r.map(csvEscape).join(delimitatore)).join("\n") + "\n";
}
