import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseBrasiliaDatetimeLocal } from "@/lib/timezone";

export async function GET(req: NextRequest) {
  await requireAdmin();
  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId é obrigatório" }, { status: 400 });

  const missions = await db.mission.findMany({ where: { eventId }, orderBy: { order: "asc" } });
  return NextResponse.json({ missions });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();
  const {
    eventId,
    type,
    title,
    description,
    required,
    linkUrl,
    quizOptions,
    quizCorrectIndex,
    unlockAt,
    grantsExtraTicket,
    requiresApproval,
  } = body;

  if (!eventId || !type || !title) {
    return NextResponse.json({ error: "eventId, type e title são obrigatórios" }, { status: 400 });
  }

  const count = await db.mission.count({ where: { eventId } });

  const mission = await db.mission.create({
    data: {
      eventId,
      type,
      title,
      description: description || null,
      required: required ?? true,
      order: count,
      linkUrl: linkUrl || null,
      quizOptions: quizOptions ?? undefined,
      quizCorrectIndex: quizCorrectIndex ?? null,
      unlockAt: unlockAt ? parseBrasiliaDatetimeLocal(unlockAt) : null,
      grantsExtraTicket: grantsExtraTicket ?? false,
      requiresApproval: requiresApproval ?? false,
    },
  });

  return NextResponse.json({ mission }, { status: 201 });
}
