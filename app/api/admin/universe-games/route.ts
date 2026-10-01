import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isUniverseEngine } from "@/lib/arcade";

export async function GET() {
  await requireAdmin();
  const games = await db.universeGame.findMany({
    include: { event: { select: { name: true, slug: true } } },
    orderBy: [{ eventId: "asc" }, { order: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ games });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));

  const { eventId, slug, title, engine } = body;
  if (!eventId || !slug || !title || !engine) {
    return NextResponse.json(
      { error: "eventId, slug, title e engine são obrigatórios" },
      { status: 400 }
    );
  }
  if (!isUniverseEngine(engine)) {
    return NextResponse.json({ error: "engine inválido" }, { status: 400 });
  }

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  }

  const slugTaken = await db.universeGame.findUnique({ where: { slug } });
  if (slugTaken) {
    return NextResponse.json({ error: "Esse slug já está em uso por outro jogo do Universo AS" }, { status: 409 });
  }

  // Nasce em DRAFT - mesma régua da aba Jogos: só o admin vê até promover
  // pra Teste/Ao vivo.
  const game = await db.universeGame.create({
    data: {
      eventId,
      engine,
      slug,
      title,
      description: typeof body.description === "string" ? body.description : "",
      tag: typeof body.tag === "string" ? body.tag : "",
      coverImageUrl: body.coverImageUrl || null,
      order: Number.isFinite(body.order) ? body.order : 0,
    },
  });

  return NextResponse.json({ game }, { status: 201 });
}
