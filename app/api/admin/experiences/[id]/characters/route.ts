import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const characters = await db.character.findMany({
    where: { experienceId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ characters });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json();

  const { name } = body;
  if (!name) {
    return NextResponse.json({ error: "name é obrigatório" }, { status: 400 });
  }

  const experience = await db.experience.findUnique({ where: { id: params.id } });
  if (!experience) return NextResponse.json({ error: "Experiência não encontrada" }, { status: 404 });

  const character = await db.character.create({
    data: {
      experienceId: params.id,
      name,
      rarity: body.rarity || "comum",
      imageUrl: body.imageUrl || null,
      description: body.description || null,
    },
  });

  return NextResponse.json({ character }, { status: 201 });
}
