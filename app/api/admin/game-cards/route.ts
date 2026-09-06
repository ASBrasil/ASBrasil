import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  const cards = await db.gameCard.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ cards });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();

  const { name } = body;
  if (!name) {
    return NextResponse.json({ error: "name é obrigatório" }, { status: 400 });
  }

  const card = await db.gameCard.create({
    data: {
      name,
      rarity: body.rarity || "comum",
      imageUrl: body.imageUrl || null,
      description: body.description || null,
    },
  });

  return NextResponse.json({ card }, { status: 201 });
}
