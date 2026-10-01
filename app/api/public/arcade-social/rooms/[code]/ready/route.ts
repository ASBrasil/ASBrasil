import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";

/** Marca/desmarca "pronto" da própria pessoa dentro da sala. */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ready = body.ready === true;

  const room = await db.arcadeRoom.findUnique({ where: { code: params.code.toUpperCase() } });
  if (!room) return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });

  const membership = await db.arcadeRoomPlayer.findUnique({ where: { roomId_email: { roomId: room.id, email } } });
  if (!membership) return NextResponse.json({ error: "Você não está nessa sala" }, { status: 403 });

  await db.arcadeRoomPlayer.update({ where: { id: membership.id }, data: { ready } });
  return NextResponse.json({ ok: true });
}
