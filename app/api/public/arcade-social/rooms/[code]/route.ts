import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { ARCADE_GAME_NAMES, buildRoomPlayers, isArcadeGameId } from "@/lib/arcade-social";

/**
 * Estado completo de uma sala - é essa rota que o componente faz polling a
 * cada 2,5s enquanto a sala está aberta na tela. Só quem já é membro da
 * sala pode ver (ver join/route.ts pra entrar).
 */
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const room = await db.arcadeRoom.findUnique({ where: { code: params.code.toUpperCase() } });
  if (!room || !isArcadeGameId(room.gameId)) return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });

  const membership = await db.arcadeRoomPlayer.findUnique({ where: { roomId_email: { roomId: room.id, email } } });
  if (!membership) return NextResponse.json({ error: "Você não está nessa sala" }, { status: 403 });

  const players = await buildRoomPlayers(room.id, room.gameId, room.hostEmail);

  return NextResponse.json({
    code: room.code,
    gameId: room.gameId,
    gameName: ARCADE_GAME_NAMES[room.gameId],
    status: room.status,
    hostEmail: room.hostEmail,
    isHost: room.hostEmail === email,
    players,
  });
}
