import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * Swaps this prize's `order` with whichever prize is immediately before/
 * after it (by order, within the same event) - a full reorder is just N
 * of these one at a time from the admin's perspective, and each move is
 * a single atomic swap so there's never a moment with two prizes sharing
 * an order value or a gap opening up.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json();
  const direction = body.direction as "up" | "down";
  if (direction !== "up" && direction !== "down") {
    return NextResponse.json({ error: "direction deve ser 'up' ou 'down'" }, { status: 400 });
  }

  const current = await db.prize.findUnique({ where: { id: params.id } });
  if (!current) {
    return NextResponse.json({ error: "Prêmio não encontrado" }, { status: 404 });
  }

  const neighbor = await db.prize.findFirst({
    where: {
      eventId: current.eventId,
      order: direction === "up" ? { lt: current.order } : { gt: current.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });

  if (!neighbor) {
    // Already first/last - nothing to do, not an error.
    return NextResponse.json({ ok: true });
  }

  await db.$transaction([
    db.prize.update({ where: { id: current.id }, data: { order: neighbor.order } }),
    db.prize.update({ where: { id: neighbor.id }, data: { order: current.order } }),
  ]);

  return NextResponse.json({ ok: true });
}
