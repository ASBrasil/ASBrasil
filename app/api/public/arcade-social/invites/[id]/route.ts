import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";

/** Aceitar entra na sala automaticamente; recusar só marca o convite como recusado. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body.action !== "accept" && body.action !== "decline") {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }

  const invite = await db.arcadeInvite.findUnique({ where: { id: params.id }, include: { room: true } });
  if (!invite || invite.toEmail !== email) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  if (invite.status !== "PENDING") return NextResponse.json({ error: "Convite já respondido" }, { status: 409 });

  if (body.action === "decline") {
    await db.arcadeInvite.update({ where: { id: invite.id }, data: { status: "DECLINED" } });
    return NextResponse.json({ ok: true });
  }

  if (invite.room.status === "FINISHED") {
    return NextResponse.json({ error: "Essa sala já foi encerrada" }, { status: 409 });
  }

  await db.$transaction([
    db.arcadeInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } }),
    db.arcadeRoomPlayer.upsert({
      where: { roomId_email: { roomId: invite.roomId, email } },
      create: { roomId: invite.roomId, email },
      update: {},
    }),
  ]);

  return NextResponse.json({ ok: true, roomCode: invite.room.code });
}
