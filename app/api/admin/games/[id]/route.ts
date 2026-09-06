import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const VALID_VISIBILITY = ["DRAFT", "TESTING", "LIVE"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.theme !== undefined) data.theme = body.theme;
  if (body.visibility !== undefined) {
    if (!VALID_VISIBILITY.includes(body.visibility)) {
      return NextResponse.json(
        { error: `visibility deve ser um de: ${VALID_VISIBILITY.join(", ")}` },
        { status: 400 }
      );
    }
    data.visibility = body.visibility;
  }

  const game = await db.game.update({ where: { id: params.id }, data });
  return NextResponse.json({ game });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  // Cascade apaga fases junto (GamePhase.gameId onDelete: Cascade) - mas
  // não mexe no álbum de figurinhas (GameCard é catálogo compartilhado,
  // sobrevive mesmo que o jogo de origem seja excluído) nem no progresso
  // já registrado do jogador continua contando pro XP dele.
  await db.game.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
