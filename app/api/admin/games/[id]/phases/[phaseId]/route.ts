import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string; phaseId: string } }
) {
  await requireAdmin();
  const body = await _req.json();

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.content !== undefined) data.content = body.content;
  if (body.points !== undefined) data.points = body.points;
  if (body.rewardCardId !== undefined) data.rewardCardId = body.rewardCardId || null;
  if (body.grantsExtraTicket !== undefined) data.grantsExtraTicket = !!body.grantsExtraTicket;
  if (body.order !== undefined) data.order = body.order;

  const phase = await db.gamePhase.update({ where: { id: params.phaseId }, data });
  return NextResponse.json({ phase });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; phaseId: string } }
) {
  await requireAdmin();
  await db.gamePhase.delete({ where: { id: params.phaseId } });
  return NextResponse.json({ ok: true });
}
