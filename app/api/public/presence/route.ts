import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";

/**
 * Ping de presença: o painel do participante (ver PresenceHeartbeat) chama
 * essa rota a cada ~25s enquanto a aba está aberta e visível. Cada chamada
 * só faz um upsert (não guarda histórico) - o dashboard do admin conta
 * "online agora" como quem tem um ping nos últimos ~90s. Silenciosamente
 * ignora se não tiver sessão ou eventId - isso nunca pode quebrar a tela
 * de quem só quer ver o número.
 */
export async function POST(req: NextRequest) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ ok: false }, { status: 200 });

  const body = await req.json().catch(() => ({}));
  const eventId = typeof body.eventId === "string" ? body.eventId : null;
  if (!eventId) return NextResponse.json({ ok: false }, { status: 200 });

  await db.presence
    .upsert({
      where: { eventId_email: { eventId, email } },
      create: { eventId, email },
      update: { lastSeenAt: new Date() },
    })
    .catch((err) => console.error("Falha ao registrar presença:", err));

  return NextResponse.json({ ok: true });
}
