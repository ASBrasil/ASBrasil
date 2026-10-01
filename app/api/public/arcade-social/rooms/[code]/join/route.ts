import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { ensureUniverseProfile } from "@/lib/arcade-social";

/** Entrar numa sala digitando o código - só funciona enquanto ela está esperando (WAITING). */
export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const room = await db.arcadeRoom.findUnique({ where: { code: params.code.toUpperCase() } });
  if (!room) return NextResponse.json({ error: "Código não encontrado" }, { status: 404 });
  if (room.status !== "WAITING") return NextResponse.json({ error: "Essa sala já começou" }, { status: 409 });

  await ensureUniverseProfile(email);
  await db.arcadeRoomPlayer.upsert({
    where: { roomId_email: { roomId: room.id, email } },
    create: { roomId: room.id, email },
    update: {},
  });

  return NextResponse.json({ code: room.code });
}
