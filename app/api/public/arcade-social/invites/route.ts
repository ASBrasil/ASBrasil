import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { ARCADE_GAME_NAMES, isArcadeGameId, labelFor } from "@/lib/arcade-social";

/** Convites pendentes recebidos pela pessoa logada, com o nome de quem convidou e a sala/jogo. */
export async function GET() {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const rows = await db.arcadeInvite.findMany({
    where: { toEmail: email, status: "PENDING" },
    include: {
      from: { select: { email: true, displayName: true } },
      room: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const invites = rows
    .filter((r) => isArcadeGameId(r.room.gameId) && r.room.status !== "FINISHED")
    .map((r) => ({
      id: r.id,
      fromLabel: labelFor(r.from.email, r.from.displayName),
      roomCode: r.room.code,
      gameId: r.room.gameId,
      gameName: ARCADE_GAME_NAMES[r.room.gameId as keyof typeof ARCADE_GAME_NAMES],
      createdAt: r.createdAt,
    }));

  return NextResponse.json({ invites });
}

/**
 * Convida um amigo pra uma sala já criada. Só quem já está na sala pode
 * convidar, e só pode convidar quem é amigo aceito - evita spam de convite
 * pra desconhecido.
 */
export async function POST(req: NextRequest) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const roomId = typeof body.roomId === "string" ? body.roomId : "";
  const toEmail = typeof body.toEmail === "string" ? body.toEmail.trim().toLowerCase() : "";
  if (!roomId || !toEmail) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const room = await db.arcadeRoom.findUnique({ where: { id: roomId } });
  if (!room) return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
  if (room.status === "FINISHED") return NextResponse.json({ error: "Sala já encerrada" }, { status: 409 });

  const membership = await db.arcadeRoomPlayer.findUnique({ where: { roomId_email: { roomId, email } } });
  if (!membership) return NextResponse.json({ error: "Você não está nessa sala" }, { status: 403 });

  const isFriend = await db.arcadeFriendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterEmail: email, addresseeEmail: toEmail },
        { requesterEmail: toEmail, addresseeEmail: email },
      ],
    },
  });
  if (!isFriend) return NextResponse.json({ error: "Só dá pra convidar quem já é seu amigo" }, { status: 403 });

  const existing = await db.arcadeInvite.findUnique({ where: { roomId_toEmail: { roomId, toEmail } } });
  const invite = existing
    ? await db.arcadeInvite.update({ where: { id: existing.id }, data: { status: "PENDING", fromEmail: email } })
    : await db.arcadeInvite.create({ data: { roomId, fromEmail: email, toEmail, status: "PENDING" } });

  return NextResponse.json({ id: invite.id, status: invite.status });
}
