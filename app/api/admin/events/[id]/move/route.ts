import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * Same swap pattern as prize reordering: moves are scoped to events sharing
 * the same `archived` state, so reordering the "Ativos" tab never touches
 * anything in "Arquivados" and vice versa - matches what's visually
 * grouped together in the admin listing.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json();
  const direction = body.direction as "up" | "down";
  if (direction !== "up" && direction !== "down") {
    return NextResponse.json({ error: "direction deve ser 'up' ou 'down'" }, { status: 400 });
  }

  const current = await db.event.findUnique({ where: { id: params.id } });
  if (!current) {
    return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  }

  const neighbor = await db.event.findFirst({
    where: {
      archived: current.archived,
      order: direction === "up" ? { lt: current.order } : { gt: current.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });

  if (!neighbor) {
    return NextResponse.json({ ok: true }); // already first/last
  }

  await db.$transaction([
    db.event.update({ where: { id: current.id }, data: { order: neighbor.order } }),
    db.event.update({ where: { id: neighbor.id }, data: { order: current.order } }),
  ]);

  return NextResponse.json({ ok: true });
}
