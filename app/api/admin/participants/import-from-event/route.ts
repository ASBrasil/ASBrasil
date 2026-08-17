import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { generateNumberPool } from "@/lib/raffle";
import { ParticipantSource } from "@prisma/client";

const CHUNK_SIZE = 1000; // mesmo tamanho de lote usado na importação por planilha

/**
 * Copies every Participant row from `sourceEventId` into `targetEventId` -
 * a third way to seed participants alongside spreadsheet import and public
 * signup, useful when running a follow-up raffle for the same crowd that
 * already registered somewhere else.
 *
 * Deliberately generates a FRESH raffleNumber pool rather than reusing the
 * source event's numbers (raffleNumber is only unique per-event, but reusing
 * the exact same numbers across events would be confusing - "número 4821"
 * should mean something different in each raffle). ticketCode carries over
 * as-is since its uniqueness is also scoped per event, so there's no
 * collision risk copying it into a different event.
 *
 * Participants whose e-mail already exists in the target event are skipped
 * (not duplicated) - keeps this safe to re-run if it's ever used on an
 * event that isn't brand new.
 */
export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();
  const { targetEventId, sourceEventId } = body;

  if (!targetEventId || !sourceEventId) {
    return NextResponse.json(
      { error: "targetEventId e sourceEventId são obrigatórios" },
      { status: 400 }
    );
  }
  if (targetEventId === sourceEventId) {
    return NextResponse.json({ error: "Escolha um evento diferente do atual" }, { status: 400 });
  }

  const sourceEvent = await db.event.findUnique({
    where: { id: sourceEventId },
    select: { id: true, name: true },
  });
  if (!sourceEvent) {
    return NextResponse.json({ error: "Evento de origem não encontrado" }, { status: 404 });
  }

  const [sourceParticipants, existingEmails] = await Promise.all([
    db.participant.findMany({
      where: { eventId: sourceEventId },
      select: { name: true, email: true, phone: true, cpf: true, orderNumber: true, ticketCode: true },
    }),
    db.participant
      .findMany({ where: { eventId: targetEventId }, select: { email: true } })
      .then((rows) => new Set(rows.map((r) => r.email.toLowerCase()))),
  ]);

  const toInsert = sourceParticipants.filter((p) => !existingEmails.has(p.email.toLowerCase()));
  const skipped = sourceParticipants.length - toInsert.length;

  const numbers = toInsert.length > 0 ? generateNumberPool(toInsert.length) : [];

  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    const chunkNumbers = numbers.slice(i, i + CHUNK_SIZE);

    await db.participant.createMany({
      data: chunk.map((p, j) => ({
        eventId: targetEventId,
        name: p.name,
        email: p.email,
        phone: p.phone,
        cpf: p.cpf,
        orderNumber: p.orderNumber,
        ticketCode: p.ticketCode,
        raffleNumber: chunkNumbers[j],
        source: ParticipantSource.IMPORT,
      })),
      skipDuplicates: true, // rede de segurança final contra as constraints únicas
    });
  }

  return NextResponse.json({
    imported: toInsert.length,
    skipped,
    sourceEventName: sourceEvent.name,
  });
}
