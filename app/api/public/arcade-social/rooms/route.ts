import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { ARCADE_GAME_NAMES, ensureUniverseProfile, generateRoomCode, isArcadeGameId } from "@/lib/arcade-social";

/** Salas em que a pessoa logada está (como host ou jogador), mais recentes primeiro. */
export async function GET() {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const memberships = await db.arcadeRoomPlayer.findMany({
    where: { email },
    include: { room: { include: { _count: { select: { players: true } } } } },
    orderBy: { room: { updatedAt: "desc" } },
    take: 20,
  });

  const rooms = memberships
    .filter((m) => isArcadeGameId(m.room.gameId))
    .map((m) => ({
      code: m.room.code,
      gameId: m.room.gameId,
      gameName: ARCADE_GAME_NAMES[m.room.gameId as keyof typeof ARCADE_GAME_NAMES],
      status: m.room.status,
      isHost: m.room.hostEmail === email,
      playerCount: m.room._count.players,
      updatedAt: m.room.updatedAt,
    }));

  return NextResponse.json({ rooms });
}

/** Cria uma sala nova pra um dos 4 jogos do arcade - quem cria já entra como host/jogador. */
export async function POST(req: NextRequest) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!isArcadeGameId(body.gameId)) return NextResponse.json({ error: "Jogo inválido" }, { status: 400 });

  await ensureUniverseProfile(email);

  // Colisão de código de 6 caracteres é raríssima, mas tenta de novo se acontecer.
  let code = generateRoomCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await db.arcadeRoom.findUnique({ where: { code } });
    if (!clash) break;
    code = generateRoomCode();
  }

  const room = await db.arcadeRoom.create({
    data: {
      code,
      gameId: body.gameId,
      hostEmail: email,
      players: { create: { email } },
    },
  });

  return NextResponse.json({ code: room.code });
}
