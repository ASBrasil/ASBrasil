import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  const characters = await db.universeCharacter.findMany({
    include: { event: { select: { name: true, slug: true } } },
    orderBy: [{ eventId: "asc" }, { order: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ characters });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));

  const { eventId, name } = body;
  if (!eventId || !name) {
    return NextResponse.json({ error: "eventId e name são obrigatórios" }, { status: 400 });
  }

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  }

  const character = await db.universeCharacter.create({
    data: {
      eventId,
      name,
      imageUrl: body.imageUrl || null,
      order: Number.isFinite(body.order) ? body.order : 0,
    },
  });

  return NextResponse.json({ character }, { status: 201 });
}
