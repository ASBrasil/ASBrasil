import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseBrasiliaDatetimeLocal } from "@/lib/timezone";

export async function GET(req: NextRequest) {
  await requireAdmin();
  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId é obrigatório" }, { status: 400 });

  const prizes = await db.prize.findMany({ where: { eventId }, orderBy: { order: "asc" } });
  return NextResponse.json({ prizes });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();
  const {
    eventId,
    name,
    description,
    imageUrl,
    quantity,
    order,
    scheduledAt,
    winMessage,
    loseMessage,
    couponCode,
    surprise,
    unlockAt,
  } = body;

  if (!eventId || !name) {
    return NextResponse.json({ error: "eventId e name são obrigatórios" }, { status: 400 });
  }

  const prize = await db.prize.create({
    data: {
      eventId,
      name,
      description,
      imageUrl,
      quantity: quantity ?? 1,
      order: order ?? 0,
      scheduledAt: scheduledAt ? parseBrasiliaDatetimeLocal(scheduledAt) : null,
      winMessage,
      loseMessage,
      couponCode,
      surprise: !!surprise,
      unlockAt: unlockAt ? parseBrasiliaDatetimeLocal(unlockAt) : null,
    },
  });

  return NextResponse.json({ prize }, { status: 201 });
}
