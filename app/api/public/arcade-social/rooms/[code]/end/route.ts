import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";

/** Só o host encerra a sala - fica como histórico (placar continua visível, só não dá mais pra jogar). */
export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const room = await db.arcadeRoom.findUnique({ where: { code: params.code.toUpperCase() } });
  if (!room) return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
  if (room.hostEmail !== email) return NextResponse.json({ error: "Só o host pode encerrar" }, { status: 403 });

  await db.arcadeRoom.update({ where: { id: room.id }, data: { status: "FINISHED" } });
  return NextResponse.json({ ok: true });
}
