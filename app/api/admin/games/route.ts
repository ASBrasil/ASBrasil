import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const VALID_TYPES = ["QUIZ", "MEMORY", "RHYTHM", "HUNT", "CARDS", "REACTION", "RUN"];

export async function GET() {
  await requireAdmin();
  const games = await db.game.findMany({
    include: { event: { select: { name: true, slug: true } }, phases: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ games });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();

  const { eventId, slug, name, type } = body;
  if (!eventId || !slug || !name || !type) {
    return NextResponse.json(
      { error: "eventId, slug, name e type são obrigatórios" },
      { status: 400 }
    );
  }
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: `type deve ser um de: ${VALID_TYPES.join(", ")}` }, { status: 400 });
  }

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  }

  const slugTaken = await db.game.findUnique({ where: { slug } });
  if (slugTaken) {
    return NextResponse.json({ error: "Esse slug já está em uso por outro jogo" }, { status: 409 });
  }

  // Todo jogo novo nasce em DRAFT - só o admin vê, ninguém de fora enxerga
  // a aba nem sabe que existe até virar TESTING/LIVE.
  const game = await db.game.create({
    data: { eventId, slug, name, type, visibility: "DRAFT" },
  });

  return NextResponse.json({ game }, { status: 201 });
}
