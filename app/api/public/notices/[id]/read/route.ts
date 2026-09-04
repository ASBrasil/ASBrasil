import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const notice = await db.participantNotice.findUnique({ where: { id: params.id } });
  // Só marca como lido se o aviso realmente for dessa pessoa - evita que uma
  // sessão marque o recado de outro e-mail como visto.
  if (!notice || notice.email !== email) {
    return NextResponse.json({ error: "Aviso não encontrado" }, { status: 404 });
  }

  await db.participantNotice.update({ where: { id: params.id }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
