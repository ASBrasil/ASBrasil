import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json();

  const { title, content, points, rewardCardId, grantsExtraTicket } = body;
  if (!title || !content) {
    return NextResponse.json({ error: "title e content são obrigatórios" }, { status: 400 });
  }

  const game = await db.game.findUnique({ where: { id: params.id }, include: { phases: true } });
  if (!game) return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });

  const nextOrder = game.phases.length
    ? Math.max(...game.phases.map((p: { order: number }) => p.order)) + 1
    : 0;

  const phase = await db.gamePhase.create({
    data: {
      gameId: game.id,
      order: nextOrder,
      // Fase 1 só tem QUIZ - o tipo da fase segue o tipo do jogo por
      // enquanto (memória/ritmo/caça entram depois, cada um com seu
      // formato de content e componente de jogo próprio).
      type: game.type,
      title,
      content,
      points: typeof points === "number" ? points : 10,
      rewardCardId: rewardCardId || null,
      grantsExtraTicket: !!grantsExtraTicket,
    },
  });

  return NextResponse.json({ phase }, { status: 201 });
}
