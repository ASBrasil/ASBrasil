import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null;
  if (body.order !== undefined && Number.isFinite(body.order)) data.order = body.order;
  if (body.eventId !== undefined) {
    const event = await db.event.findUnique({ where: { id: body.eventId } });
    if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    data.eventId = body.eventId;
  }

  const character = await db.universeCharacter.update({ where: { id: params.id }, data });
  return NextResponse.json({ character });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  await db.universeCharacter.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
