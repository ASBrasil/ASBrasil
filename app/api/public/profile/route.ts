import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";

export async function PATCH(req: NextRequest) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();

  if (body.name !== undefined) {
    const name = String(body.name ?? "").trim();
    const phone = body.phone ? String(body.phone).trim() : null;
    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }
    await db.participant.updateMany({
      where: { email },
      data: { name, phone },
    });
  }

  const wantsProfileUpdate =
    body.displayName !== undefined || body.avatarUrl !== undefined || body.winnerPhotoUrl !== undefined;
  if (wantsProfileUpdate) {
    const displayName = body.displayName !== undefined ? String(body.displayName).trim() || null : undefined;
    const avatarUrl = body.avatarUrl !== undefined ? body.avatarUrl || null : undefined;
    const winnerPhotoUrl = body.winnerPhotoUrl !== undefined ? body.winnerPhotoUrl || null : undefined;

    await db.universeProfile.upsert({
      where: { email },
      create: {
        email,
        displayName: displayName ?? null,
        avatarUrl: avatarUrl ?? null,
        winnerPhotoUrl: winnerPhotoUrl ?? null,
      },
      update: {
        ...(displayName !== undefined ? { displayName } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        ...(winnerPhotoUrl !== undefined ? { winnerPhotoUrl } : {}),
      },
    });
  }

  return NextResponse.json({ ok: true });
}