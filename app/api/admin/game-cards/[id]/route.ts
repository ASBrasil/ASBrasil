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
  if (body.description !== undefined) data.description = body.description || null;
  // unlockEventId/unlockGameId são mutuamente exclusivos - manda os dois
  // juntos só quando o form realmente muda o gatilho (ver GameCardManager),
  // então aqui só precisa garantir que não fica os dois setados ao mesmo
  // tempo se por algum motivo vierem juntos.
  if (body.unlockEventId !== undefined || body.unlockGameId !== undefined) {
    const unlockEventId = body.unlockEventId || null;
    data.unlockEventId = unlockEventId;
    data.unlockGameId = unlockEventId ? null : body.unlockGameId || null;
  }

  const card = await db.gameCard.update({ where: { id: params.id }, data });
  return NextResponse.json({ card });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  // Se algum GamePhase apontar essa carta como recompensa, o campo dele
  // vira null (rewardCardId onDelete: SetNull) - a fase não fica quebrada,
  // só some a recompensa configurada.
  await db.gameCard.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
