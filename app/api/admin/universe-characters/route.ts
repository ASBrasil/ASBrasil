import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  const characters = await db.universeCharacter.findMany({
    include: { experience: { select: { name: true, slug: true } } },
    orderBy: [{ experienceId: "asc" }, { order: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ characters });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));

  const { experienceId, name } = body;
  if (!experienceId || !name) {
    return NextResponse.json({ error: "experienceId e name são obrigatórios" }, { status: 400 });
  }

  const experience = await db.experience.findUnique({ where: { id: experienceId } });
  if (!experience) {
    return NextResponse.json({ error: "Experiência não encontrada" }, { status: 404 });
  }

  const character = await db.universeCharacter.create({
    data: {
      experienceId,
      name,
      imageUrl: body.imageUrl || null,
      order: Number.isFinite(body.order) ? body.order : 0,
    },
  });

  return NextResponse.json({ character }, { status: 201 });
}
