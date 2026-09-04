import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";

/**
 * Busca o aviso não lido mais recente pra essa pessoa nesse evento (se
 * houver mais de um pendente, mostra só o mais novo por vez - os outros
 * aparecem depois que esse for marcado como lido). Usado pelo
 * MissionNoticePopup no painel do participante.
 */
export async function GET(req: NextRequest) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ notice: null });

  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId é obrigatório" }, { status: 400 });

  const notice = await db.participantNotice.findFirst({
    where: { eventId, email, readAt: null },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    notice: notice ? { id: notice.id, message: notice.message } : null,
  });
}
