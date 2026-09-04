import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * Dispara um aviso pontual pra uma pessoa específica (usado no painel de
 * "Pendências de pré-requisito" do dashboard do evento). Não existe envio
 * de e-mail/push no sistema - isso só guarda a mensagem, e ela aparece
 * como pop-up (MissionNoticePopup) da próxima vez que essa pessoa abrir o
 * painel do evento no site.
 */
export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();
  const eventId = String(body.eventId ?? "");
  const email = String(body.email ?? "").trim().toLowerCase();
  const message = String(body.message ?? "").trim();

  if (!eventId || !email || !message) {
    return NextResponse.json({ error: "eventId, email e message são obrigatórios" }, { status: 400 });
  }

  const notice = await db.participantNotice.create({
    data: { eventId, email, message },
  });

  return NextResponse.json({ notice }, { status: 201 });
}
