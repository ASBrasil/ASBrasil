import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { ensureUniverseProfile, labelFor } from "@/lib/arcade-social";

/**
 * Lista de amizades da pessoa logada: aceitas (amigos de verdade), pedidos
 * recebidos pendentes e pedidos enviados pendentes - separados pra UI poder
 * mostrar cada grupo com a ação certa (aceitar/recusar/cancelar/remover).
 */
export async function GET() {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const rows = await db.arcadeFriendship.findMany({
    where: { OR: [{ requesterEmail: email }, { addresseeEmail: email }] },
    include: {
      requester: { select: { email: true, displayName: true, avatarUrl: true, avatarCharacter: { select: { imageUrl: true } } } },
      addressee: { select: { email: true, displayName: true, avatarUrl: true, avatarCharacter: { select: { imageUrl: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  function view(row: (typeof rows)[number]) {
    const isRequester = row.requesterEmail === email;
    const other = isRequester ? row.addressee : row.requester;
    return {
      id: row.id,
      email: other.email,
      label: labelFor(other.email, other.displayName),
      avatarUrl: other.avatarCharacter?.imageUrl ?? other.avatarUrl ?? null,
      createdAt: row.createdAt,
    };
  }

  const friends = rows.filter((r) => r.status === "ACCEPTED").map(view);
  const incoming = rows.filter((r) => r.status === "PENDING" && r.addresseeEmail === email).map(view);
  const outgoing = rows.filter((r) => r.status === "PENDING" && r.requesterEmail === email).map(view);

  return NextResponse.json({ friends, incoming, outgoing });
}

/**
 * Envia um pedido de amizade por e-mail. O e-mail alvo precisa já existir
 * como Participant em algum sorteio do sistema (mesma checagem usada pra
 * puxar o nome ao criar uma UniverseProfile nova) - evita gente mandando
 * pedido pra e-mail qualquer que nunca participou de nada da AS Brasil.
 * Se já existir um pedido na direção contrária (a outra pessoa te chamou
 * primeiro), aceita direto em vez de criar um segundo pedido cruzado.
 */
export async function POST(req: NextRequest) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const targetEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!targetEmail || !targetEmail.includes("@")) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }
  if (targetEmail === email.toLowerCase()) {
    return NextResponse.json({ error: "Você não pode adicionar a si mesmo" }, { status: 400 });
  }

  const participant = await db.participant.findFirst({ where: { email: targetEmail } });
  if (!participant) {
    return NextResponse.json({ error: "Esse e-mail ainda não participou de nenhum sorteio da AS Brasil" }, { status: 404 });
  }

  await ensureUniverseProfile(email);
  await ensureUniverseProfile(targetEmail);

  const reverse = await db.arcadeFriendship.findUnique({
    where: { requesterEmail_addresseeEmail: { requesterEmail: targetEmail, addresseeEmail: email } },
  });
  if (reverse) {
    if (reverse.status === "ACCEPTED") return NextResponse.json({ error: "Vocês já são amigos" }, { status: 409 });
    const updated = await db.arcadeFriendship.update({ where: { id: reverse.id }, data: { status: "ACCEPTED" } });
    return NextResponse.json({ status: updated.status });
  }

  const existing = await db.arcadeFriendship.findUnique({
    where: { requesterEmail_addresseeEmail: { requesterEmail: email, addresseeEmail: targetEmail } },
  });
  if (existing) {
    if (existing.status === "DECLINED") {
      const updated = await db.arcadeFriendship.update({ where: { id: existing.id }, data: { status: "PENDING" } });
      return NextResponse.json({ status: updated.status });
    }
    return NextResponse.json({ error: existing.status === "ACCEPTED" ? "Vocês já são amigos" : "Pedido já enviado" }, { status: 409 });
  }

  const created = await db.arcadeFriendship.create({
    data: { requesterEmail: email, addresseeEmail: targetEmail, status: "PENDING" },
  });
  return NextResponse.json({ status: created.status });
}
