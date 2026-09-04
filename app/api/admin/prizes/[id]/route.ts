import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseBrasiliaDatetimeLocal } from "@/lib/timezone";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const prize = await db.prize.findUnique({
    where: { id: params.id },
    include: {
      drawResults: {
        where: { voided: false },
        include: { participant: { select: { name: true } } },
      },
    },
  });
  if (!prize) return NextResponse.json({ error: "Prêmio não encontrado" }, { status: 404 });
  return NextResponse.json({ prize });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
  if (body.quantity !== undefined) data.quantity = body.quantity;
  if (body.order !== undefined) data.order = body.order;
  if (body.rules !== undefined) data.rules = body.rules;
  if (body.scheduledAt !== undefined) {
    if (body.scheduledAt) {
      const parsed = parseBrasiliaDatetimeLocal(body.scheduledAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: `Data do sorteio inválida: "${body.scheduledAt}"` },
          { status: 400 }
        );
      }
      data.scheduledAt = parsed;
    } else {
      data.scheduledAt = null;
    }
  }
  if (body.winMessage !== undefined) data.winMessage = body.winMessage;
  if (body.loseMessage !== undefined) data.loseMessage = body.loseMessage;
  if (body.couponCode !== undefined) data.couponCode = body.couponCode;
  if (body.autoDraw !== undefined) data.autoDraw = body.autoDraw;
  if (body.surprise !== undefined) data.surprise = !!body.surprise;
  if (body.unlockAt !== undefined) {
    if (body.unlockAt) {
      const parsed = parseBrasiliaDatetimeLocal(body.unlockAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: `Data de revelação inválida: "${body.unlockAt}"` },
          { status: 400 }
        );
      }
      data.unlockAt = parsed;
    } else {
      data.unlockAt = null;
    }
  }

  try {
    const prize = await db.prize.update({ where: { id: params.id }, data });
    return NextResponse.json({ prize });
  } catch (err) {
    console.error("Falha ao atualizar prêmio:", err);
    return NextResponse.json(
      { error: "Não foi possível salvar as alterações no banco de dados." },
      { status: 500 }
    );
  }
}
