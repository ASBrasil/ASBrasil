import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * Bulk version of DELETE /api/admin/participants/[id]. Participants who
 * already won something have a DrawResult pointing at them - that's the
 * audit trail for the draw, and letting a bulk action silently wipe it out
 * would be worse than the single-delete case (easy to select a big range
 * without noticing a winner is in it). Those get skipped rather than
 * blocking the whole batch; the caller finds out via blockedCount.
 */
export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();
  const ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "Nenhum participante selecionado" }, { status: 400 });
  }

  const withResults = await db.drawResult.findMany({
    where: { participantId: { in: ids } },
    select: { participantId: true },
    distinct: ["participantId"],
  });
  const blockedIds = new Set(withResults.map((r) => r.participantId));
  const deletableIds = ids.filter((id) => !blockedIds.has(id));

  const result =
    deletableIds.length > 0
      ? await db.participant.deleteMany({ where: { id: { in: deletableIds } } })
      : { count: 0 };

  return NextResponse.json({
    deletedCount: result.count,
    blockedCount: blockedIds.size,
  });
}
