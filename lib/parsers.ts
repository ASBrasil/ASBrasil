import { Readable } from "node:stream";
import { parse } from "csv-parse";
import ExcelJS from "exceljs";
import type { RawRow } from "./import";

/** Streams rows from a CSV file, keyed by header. */
export async function* parseCsvRows(buffer: Buffer): AsyncGenerator<RawRow> {
  const parser = Readable.from(buffer).pipe(
    parse({ columns: true, skip_empty_lines: true, trim: true, bom: true })
  );
  for await (const record of parser) {
    yield record as RawRow;
  }
}

/**
 * Streams rows from an XLSX file using ExcelJS's streaming reader, so a
 * 10k+ row workbook is processed row-by-row instead of loaded whole into
 * memory. Returns header names alongside the row generator so the caller
 * can build the column-mapping UI before committing to an import.
 */
export async function* parseXlsxRows(buffer: Buffer): AsyncGenerator<RawRow> {
  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(bufferToStream(buffer), {});
  let headers: string[] = [];

  for await (const worksheet of workbookReader) {
    let isFirstRow = true;
    for await (const row of worksheet) {
      const values = (row.values as (string | number | undefined)[]).slice(1); // 1-indexed
      if (isFirstRow) {
        headers = values.map((v) => String(v ?? "").trim());
        isFirstRow = false;
        continue;
      }
      const record: RawRow = {};
      headers.forEach((h, i) => (record[h] = values[i]));
      yield record;
    }
    break; // only the first sheet
  }
}

/** Peeks the header row only, for building the mapping UI without a full parse. */
export async function peekHeaders(buffer: Buffer, kind: "csv" | "xlsx"): Promise<string[]> {
  if (kind === "csv") {
    for await (const row of parseCsvRows(buffer)) {
      return Object.keys(row);
    }
    return [];
  }
  for await (const row of parseXlsxRows(buffer)) {
    return Object.keys(row);
  }
  return [];
}

function bufferToStream(buffer: Buffer) {
  return Readable.from(buffer);
}
