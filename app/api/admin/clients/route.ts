import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { generateNumberPool } from "@/lib/raffle";
import { ParticipantSource } from "@prisma/client";

/**
 * Manually registers one person into one or more events at once - the
 * admin's way of adding someone who isn't in a spreadsheet and didn't
 * sign up publicly (e.g. a VIP added by hand, or fixing a missed import
 * row). Skips (not duplicates) any event where that e-mail is already
 * registered, same safety net as the spreadsheet/import-from-event paths.
 */
export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();
  const { name, email, phone, cpf, orderNumber, eventIds } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "Nome e e-mail são obrigatórios" }, { status: 400 });
  }
  if (!Array.isArray(eventIds) || eventIds.length === 0) {
    return NextResponse.json({ error: "Escolha pelo menos um evento" }, { status: 400 });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const existing = await db.participant.findMany({
    where: { email: normalizedEmail, eventId: { in: eventIds } },
    select: { eventId: true },
  });
  const alreadyIn = new Set(existing.map((p) => p.eventId));
  const targetEventIds = eventIds.filter((id: string) => !alreadyIn.has(id));

  if (targetEventIds.length === 0) {
    return NextResponse.json(
      { error: "Esse e-mail já está cadastrado em todos os eventos selecionados." },
      { status: 409 }
    );
  }

  const numbers = generateNumberPool(targetEventIds.length);

  await db.participant.createMany({
    data: targetEventIds.map((eventId: string, i: number) => ({
      eventId,
      name,
      email: normalizedEmail,
      phone: phone || null,
      cpf: cpf || null,
      orderNumber: orderNumber || null,
      raffleNumber: numbers[i],
      source: ParticipantSource.MANUAL,
    })),
  });

  return NextResponse.json({
    created: targetEventIds.length,
    skipped: eventIds.length - targetEventIds.length,
  });
}
