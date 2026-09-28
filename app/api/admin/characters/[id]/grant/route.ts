import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { grantCharacter } from "@/lib/characters";

/**
 * Concessão manual de personagem - mesmo padrão de
 * app/api/admin/game-cards/[id]/grant/route.ts, só que sem o modo
 * "backfillEvent" (Personagens não têm gatilho de inscrição em evento,
 * só de fase perfeita - ver GamePhase.rewardCharacterId).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();

  const character = await db.character.findUnique({ where: { id: params.id } });
  if (!character) return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const raw = String(body.emails ?? "");
  const emails = raw
    .split(/[\n,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));

  let granted = 0;
  for (const email of emails) {
    await grantCharacter(email, character.id);
    granted++;
  }

  return NextResponse.json({ granted, total: emails.length });
}
