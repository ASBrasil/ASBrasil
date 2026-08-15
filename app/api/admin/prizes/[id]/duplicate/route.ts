import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * Duplicates a single prize within the same event - useful when several
 * prizes share most of their setup (photo, win/lose messages) and only the
 * name or coupon really changes. Deliberately resets status to PENDING and
 * drops scheduledAt: a copy of an already-drawn prize shouldn't inherit
 * "already drawn" or a date that almost certainly doesn't apply to it.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();

  const original = await db.prize.findUnique({ where: { id: params.id } });
  if (!original) {
    return NextResponse.json({ error: "Prêmio não encontrado" }, { status: 404 });
  }

  const last = await db.prize.findFirst({
    where: { eventId: original.eventId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const prize = await db.prize.create({
    data: {
      eventId: original.eventId,
      name: `${original.name} (cópia)`,
      description: original.description,
      imageUrl: original.imageUrl,
      quantity: original.quantity,
      order: (last?.order ?? -1) + 1,
      status: "PENDING",
      scheduledAt: null,
      rules: original.rules,
      winMessage: original.winMessage,
      loseMessage: original.loseMessage,
      couponCode: original.couponCode,
    },
  });

  return NextResponse.json({ prize }, { status: 201 });
}
