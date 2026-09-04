import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";

/**
 * Participante pede pra ser avisado quando um prêmio surpresa for
 * revelado. Não dispara e-mail nenhum sozinho - só guarda o pedido
 * (PrizeNotifyRequest). O admin exporta essa lista e dispara pelo Brevo
 * quando o prêmio revelar.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const prize = await db.prize.findUnique({ where: { id: params.id } });
  if (!prize) return NextResponse.json({ error: "Prêmio não encontrado" }, { status: 404 });

  await db.prizeNotifyRequest.upsert({
    where: { prizeId_email: { prizeId: prize.id, email } },
    create: { prizeId: prize.id, email },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
