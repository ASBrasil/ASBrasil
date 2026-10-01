import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";

/**
 * Sair da sala. Se quem sair for o host e ainda sobrar gente, passa o posto
 * pra quem entrou há mais tempo depois dele; se a sala ficar vazia, apaga
 * ela (os convites pendentes somem junto, cascade).
 */
export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const room = await db.arcadeRoom.findUnique({ where: { code: params.code.toUpperCase() } });
  if (!room) return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });

  const membership = await db.arcadeRoomPlayer.findUnique({ where: { roomId_email: { roomId: room.id, email } } });
  if (!membership) return NextResponse.json({ error: "Você não está nessa sala" }, { status: 403 });

  await db.arcadeRoomPlayer.delete({ where: { id: membership.id } });

  const remaining = await db.arcadeRoomPlayer.findMany({ where: { roomId: room.id }, orderBy: { joinedAt: "asc" } });
  if (remaining.length === 0) {
    await db.arcadeRoom.delete({ where: { id: room.id } });
  } else if (room.hostEmail === email) {
    await db.arcadeRoom.update({ where: { id: room.id }, data: { hostEmail: remaining[0].email } });
  }

  return NextResponse.json({ ok: true });
}
