import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ARCADE_GAME_IDS } from "@/lib/arcade";

const VALID_VISIBILITY = ["DRAFT", "TESTING", "LIVE"];

export async function PATCH(req: NextRequest, { params }: { params: { gameId: string } }) {
  await requireAdmin();

  if (!(ARCADE_GAME_IDS as readonly string[]).includes(params.gameId)) {
    return NextResponse.json({ error: "Jogo de arcade inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  if (!VALID_VISIBILITY.includes(body.visibility)) {
    return NextResponse.json(
      { error: `visibility deve ser um de: ${VALID_VISIBILITY.join(", ")}` },
      { status: 400 }
    );
  }

  const setting = await db.arcadeGameSetting.upsert({
    where: { gameId: params.gameId },
    create: { gameId: params.gameId, visibility: body.visibility },
    update: { visibility: body.visibility },
  });

  return NextResponse.json({ setting });
}
