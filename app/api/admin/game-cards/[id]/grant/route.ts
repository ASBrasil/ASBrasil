import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { grantCard } from "@/lib/cards";

/**
 * Concessão manual de figurinha - dois modos:
 * 1) body.emails: lista de e-mails colada (separados por vírgula/quebra de
 *    linha) - a "liberação manual por pré-requisito" pedida, pra qualquer
 *    carta, mesmo uma que já tenha um gatilho automático configurado.
 * 2) body.backfillEvent: true - só funciona se a carta tiver unlockEventId
 *    setado; concede a TODOS os e-mails que já são Participant desse
 *    evento, cobrindo quem se inscreveu antes da carta existir ou entrou
 *    por outro caminho (import do admin, por exemplo) que não passa pelo
 *    signup público.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();

  const card = await db.gameCard.findUnique({ where: { id: params.id } });
  if (!card) return NextResponse.json({ error: "Carta não encontrada" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  let emails: string[];
  if (body.backfillEvent) {
    if (!card.unlockEventId) {
      return NextResponse.json(
        { error: "Essa carta não tem um evento configurado como gatilho." },
        { status: 400 }
      );
    }
    const rows = await db.participant.findMany({
      where: { eventId: card.unlockEventId },
      select: { email: true },
      distinct: ["email"],
    });
    emails = rows.map((r: { email: string }) => r.email);
  } else {
    const raw = String(body.emails ?? "");
    emails = raw
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"));
  }

  let granted = 0;
  for (const email of emails) {
    await grantCard(email, card.id);
    granted++;
  }

  return NextResponse.json({ granted, total: emails.length });
}