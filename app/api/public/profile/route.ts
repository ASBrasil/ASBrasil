import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";

/**
 * Um e-mail pode ter várias linhas de Participant (uma por evento, ou até
 * mais de uma por evento se tiver vários ingressos) - editar o "perfil"
 * atualiza nome/telefone em todas elas de uma vez, já que são a mesma
 * pessoa por trás.
 */
export async function PATCH(req: NextRequest) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const phone = body.phone ? String(body.phone).trim() : null;

  if (!name) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  await db.participant.updateMany({
    where: { email },
    data: { name, phone },
  });

  return NextResponse.json({ ok: true });
}
