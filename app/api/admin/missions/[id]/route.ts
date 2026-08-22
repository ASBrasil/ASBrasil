import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseBrasiliaDatetimeLocal } from "@/lib/timezone";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.required !== undefined) data.required = body.required;
  if (body.linkUrl !== undefined) data.linkUrl = body.linkUrl || null;
  if (body.quizOptions !== undefined) data.quizOptions = body.quizOptions;
  if (body.quizCorrectIndex !== undefined) data.quizCorrectIndex = body.quizCorrectIndex;
  if (body.order !== undefined) data.order = body.order;
  if (body.type !== undefined) data.type = body.type;
  if (body.grantsExtraTicket !== undefined) data.grantsExtraTicket = body.grantsExtraTicket;
  if (body.unlockAt !== undefined) {
    data.unlockAt = body.unlockAt ? parseBrasiliaDatetimeLocal(body.unlockAt) : null;
  }

  const mission = await db.mission.update({ where: { id: params.id }, data });
  return NextResponse.json({ mission });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  await db.mission.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
