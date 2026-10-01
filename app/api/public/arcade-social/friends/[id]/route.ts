import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";

/** Aceitar (só quem recebeu o pedido) - recusar usa o DELETE abaixo. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body.action !== "accept") return NextResponse.json({ error: "Ação inválida" }, { status: 400 });

  const row = await db.arcadeFriendship.findUnique({ where: { id: params.id } });
  if (!row || row.addresseeEmail !== email) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  if (row.status !== "PENDING") return NextResponse.json({ error: "Pedido já respondido" }, { status: 409 });

  await db.arcadeFriendship.update({ where: { id: row.id }, data: { status: "ACCEPTED" } });
  return NextResponse.json({ ok: true });
}

/**
 * Cobre 3 casos com a mesma operação (apagar a linha): recusar um pedido
 * recebido, cancelar um pedido enviado, ou desfazer uma amizade já aceita -
 * em todos, quem está de um dos dois lados pode apagar.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const row = await db.arcadeFriendship.findUnique({ where: { id: params.id } });
  if (!row || (row.requesterEmail !== email && row.addresseeEmail !== email)) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  await db.arcadeFriendship.delete({ where: { id: row.id } });
  return NextResponse.json({ ok: true });
}
