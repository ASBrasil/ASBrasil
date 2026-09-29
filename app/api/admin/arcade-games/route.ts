import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ARCADE_GAME_IDS, ARCADE_GAME_NAMES } from "@/lib/arcade";

/** Visibilidade dos 4 jogos do arcade - gameId sem linha na tabela conta como LIVE. */
export async function GET() {
  await requireAdmin();
  const rows = await db.arcadeGameSetting.findMany();
  const byId = new Map(rows.map((r) => [r.gameId, r.visibility]));
  const games = ARCADE_GAME_IDS.map((id) => ({
    gameId: id,
    name: ARCADE_GAME_NAMES[id],
    visibility: byId.get(id) ?? "LIVE",
  }));
  return NextResponse.json({ games });
}
