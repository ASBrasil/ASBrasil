import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * Aprova/recusa a conclusão de uma missão que NÃO gera número extra
 * (grantsExtraTicket false) - essas não têm nenhum Participant/ticket
 * próprio pra moderar via /api/admin/participants/[id]/moderate, então
 * precisam da própria rota. Espelha exatamente aquela.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json();
  const { status } = body;

  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
    return NextResponse.json({ error: "status inválido" }, { status: 400 });
  }

  const completion = await db.missionCompletion.update({
    where: { id: params.id },
    data: { moderationStatus: status },
  });

  return NextResponse.json({ completion });
}
