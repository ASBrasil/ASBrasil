import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.rarity !== undefined) data.rarity = body.rarity;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null;
  if (body.cardImageUrl !== undefined) data.cardImageUrl = body.cardImageUrl || null;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.spriteId !== undefined) data.spriteId = body.spriteId || null;
  if (body.pointsCost !== undefined) data.pointsCost = Math.max(0, Number(body.pointsCost) || 0);
  if (body.isStarter !== undefined) data.isStarter = Boolean(body.isStarter);

  const character = await db.character.update({ where: { id: params.id }, data });
  return NextResponse.json({ character });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  // Se algum GamePhase apontar esse personagem como recompensa (SetNull) ou
  // alguém tiver ele como avatar (SetNull), esses campos só voltam a ficar
  // vazios - não quebra nada, ver onDelete no schema.
  await db.character.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
