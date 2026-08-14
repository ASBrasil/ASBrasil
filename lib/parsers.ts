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
 * Reads the whole workbook via ExcelJS's standard loader rather than its
 * streaming WorkbookReader. The streaming reader assumes workbook.xml (and
 * its rels) appear before the worksheet parts inside the .xlsx zip, which
 * the OOXML spec does not actually guarantee - plenty of real export tools
 * (ticket platforms, Google Sheets exports, etc.) order the zip differently
 * and crash the streaming reader outright ("Cannot read properties of
 * undefined (reading 'sheets')"). Loading fully trades away true streaming,
 * but for the realistic size range here (tens of thousands of rows) the
 * memory cost is trivial next to a serverless function's default limit,
 * and "actually parses the file" beats "streams but only for well-behaved
 * files".
 */
export async function* parseXlsxRows(buffer: Buffer): AsyncGenerator<RawRow> {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS's own type declarations expect a Buffer shape that predates the
  // newer, generic Buffer<ArrayBufferLike> from current @types/node -
  // `as unknown as Buffer` doesn't help here since that still resolves to
  // the same ambient (generic) Buffer type; `any` is the correct escape
  // hatch for a third-party typing gap like this, not a type across our
  // own code.
  await workbook.xlsx.load(buffer as any);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return;

  let headers: string[] = [];
  let isFirstRow = true;

  for (let i = 1; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const values = (row.values as (string | number | undefined)[]).slice(1); // 1-indexed
    if (isFirstRow) {
      headers = values.map((v) => String(v ?? "").trim());
      isFirstRow = false;
      continue;
    }
    const record: RawRow = {};
    headers.forEach((h, idx) => (record[h] = values[idx]));
    yield record;
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
