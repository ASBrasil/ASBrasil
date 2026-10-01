import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";

/** Só o host inicia a sala (WAITING -> PLAYING) - libera o botão de jogar pra todo mundo. */
export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const room = await db.arcadeRoom.findUnique({ where: { code: params.code.toUpperCase() } });
  if (!room) return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
  if (room.hostEmail !== email) return NextResponse.json({ error: "Só o host pode iniciar" }, { status: 403 });
  if (room.status !== "WAITING") return NextResponse.json({ error: "Sala já iniciada" }, { status: 409 });

  await db.arcadeRoom.update({ where: { id: room.id }, data: { status: "PLAYING" } });
  return NextResponse.json({ ok: true });
}
