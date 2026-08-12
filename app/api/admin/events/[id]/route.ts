import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const event = await db.event.findUnique({
    where: { id: params.id },
    include: { prizes: { orderBy: { order: "asc" } }, _count: { select: { participants: true } } },
  });
  if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  return NextResponse.json({ event });
}

/**
 * Partial update - the wizard calls this once per step (theme, then
 * participation method, then publish) instead of one big payload at the
 * end, so nothing is lost if the admin closes the tab mid-flow.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.theme !== undefined) data.theme = body.theme;
  if (body.winnerPolicy !== undefined) data.winnerPolicy = body.winnerPolicy;
  if (body.publicSignupEnabled !== undefined) data.publicSignupEnabled = body.publicSignupEnabled;
  if (body.signupFields !== undefined) data.signupFields = body.signupFields;
  if (body.active !== undefined) data.active = body.active;
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;

  const event = await db.event.update({ where: { id: params.id }, data });
  return NextResponse.json({ event });
}
