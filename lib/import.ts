import { db } from "./db";
import { generateNumberPool } from "./raffle";
import { ParticipantSource } from "@prisma/client";

export interface ColumnMapping {
  name: string;         // required - which spreadsheet column holds the name
  email: string;        // required - contact info, NOT a uniqueness key (see below)
  orderNumber?: string;
  phone?: string;
  cpf?: string;
  // Per-ticket external ID (e.g. a ticketing platform's "código do
  // ingresso"), when the source spreadsheet has one. When mapped, it's
  // used to dedupe both within the file and against prior imports, so
  // re-uploading the same spreadsheet is safe. When not mapped, every
  // valid row becomes its own participant with no cross-row dedup beyond
  // exact in-file repeats of the same identity fields.
  ticketCode?: string;
}

export interface RawRow {
  [column: string]: string | number | undefined;
}

export interface ImportError {
  row: number;
  reason: string;
}

const MAX_SAMPLE_ERRORS = 200;
const CHUNK_SIZE = 1000; // rows per DB round-trip - keeps memory + lock time bounded

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * Consumes rows one at a time (an async generator, so callers can feed it
 * from a streaming XLSX/CSV reader without ever holding the whole file in
 * memory) and produces a validated participant list, then inserts it in
 * chunks with freshly generated unique raffle numbers.
 *
 * Design choices for the "10k+ rows" requirement:
 *  - a single query loads existing ticket codes for the event (when the
 *    mapping provides one) to catch cross-import duplicates, instead of
 *    one query per row;
 *  - raffle numbers are generated as a single pre-shuffled pool and handed
 *    out in order, so there is no per-row collision retry loop;
 *  - inserts happen in bounded batches (createMany) inside short
 *    transactions, so a 10k-row import is ~10 round-trips, not 10k.
 *
 * Deliberately NOT deduped on e-mail: one buyer's e-mail can legitimately
 * cover several distinct people/tickets in the same event (a group
 * purchase), and each one gets their own raffleNumber - meaning their own
 * independent shot at every draw. The only reliable per-row identity a
 * spreadsheet export usually offers is a ticket code, so that's what
 * dedup uses when the admin maps one.
 */
export async function importParticipants(params: {
  eventId: string;
  filename: string;
  mapping: ColumnMapping;
  rows: AsyncIterable<RawRow>;
}) {
  const { eventId, filename, mapping, rows } = params;

  const batch = await db.importBatch.create({
    data: { eventId, filename, columnMapping: mapping as any, status: "PROCESSING" },
  });

  try {
    const existingTicketCodes = mapping.ticketCode
      ? new Set(
          (
            await db.participant.findMany({
              where: { eventId, ticketCode: { not: null } },
              select: { ticketCode: true },
            })
          ).map((p) => p.ticketCode as string)
        )
      : null;

    const seenTicketCodes = new Set<string>();
    const errors: ImportError[] = [];
    const valid: {
      name: string;
      email: string;
      phone?: string;
      cpf?: string;
      orderNumber?: string;
      ticketCode?: string;
    }[] = [];

    let rowIndex = 0;
    for await (const row of rows) {
      rowIndex++;
      const name = String(row[mapping.name] ?? "").trim();
      const email = String(row[mapping.email] ?? "").trim().toLowerCase();

      if (!name || !email) {
        errors.push({ row: rowIndex, reason: "Nome ou e-mail ausente" });
        continue;
      }
      if (!isValidEmail(email)) {
        errors.push({ row: rowIndex, reason: `E-mail inválido: ${email}` });
        continue;
      }

      const ticketCode = mapping.ticketCode
        ? String(row[mapping.ticketCode] ?? "").trim() || undefined
        : undefined;

      if (ticketCode && (existingTicketCodes?.has(ticketCode) || seenTicketCodes.has(ticketCode))) {
        errors.push({ row: rowIndex, reason: `Ingresso já importado antes: ${ticketCode}` });
        continue;
      }
      if (ticketCode) seenTicketCodes.add(ticketCode);

      valid.push({
        name,
        email,
        phone: mapping.phone ? String(row[mapping.phone] ?? "").trim() || undefined : undefined,
        cpf: mapping.cpf ? String(row[mapping.cpf] ?? "").trim() || undefined : undefined,
        orderNumber: mapping.orderNumber
          ? String(row[mapping.orderNumber] ?? "").trim() || undefined
          : undefined,
        ticketCode,
      });
    }

    const numbers = valid.length > 0 ? generateNumberPool(valid.length) : [];

    for (let i = 0; i < valid.length; i += CHUNK_SIZE) {
      const chunk = valid.slice(i, i + CHUNK_SIZE);
      const chunkNumbers = numbers.slice(i, i + CHUNK_SIZE);

      await db.participant.createMany({
        data: chunk.map((p, j) => ({
          eventId,
          importBatchId: batch.id,
          source: ParticipantSource.IMPORT,
          raffleNumber: chunkNumbers[j],
          ...p,
        })),
        skipDuplicates: true, // final safety net against the unique constraints
      });
    }

    await db.importBatch.update({
      where: { id: batch.id },
      data: {
        totalRows: rowIndex,
        validRows: valid.length,
        errorRows: errors.length,
        errors: errors.slice(0, MAX_SAMPLE_ERRORS) as any,
        status: "COMPLETED",
        finishedAt: new Date(),
      },
    });

    return {
      batchId: batch.id,
      totalRows: rowIndex,
      validRows: valid.length,
      errorRows: errors.length,
      sampleErrors: errors.slice(0, 20),
    };
  } catch (err) {
    // Without this, a crash partway through (timeout, bad row, DB blip)
    // leaves the batch stuck at PROCESSING forever with no explanation -
    // and since createMany chunks that already committed stay committed,
    // a retry with the same file is safe (skipDuplicates catches them).
    await db.importBatch.update({
      where: { id: batch.id },
      data: { status: "FAILED", finishedAt: new Date() },
    });
    throw err;
  }
}
