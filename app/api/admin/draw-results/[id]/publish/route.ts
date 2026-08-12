import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * Publishing is a separate, explicit step from the draw itself - the
 * briefing asked for the winner's photo to be addable *afterward*, and for
 * publication to be something the admin controls, not automatic. The draw
 * result row is never rewritten in a way that loses history: this only
 * ever sets publishedAt / winnerPhotoUrl on the current (non-voided) result.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json();

  const existing = await db.drawResult.findUnique({ where: { id: params.id } });
  if (!existing || existing.voided) {
    return NextResponse.json({ error: "Resultado de sorteio não encontrado" }, { status: 404 });
  }

  const result = await db.drawResult.update({
    where: { id: params.id },
    data: {
      winnerPhotoUrl: body.winnerPhotoUrl ?? existing.winnerPhotoUrl,
      publishedAt: body.published === false ? null : new Date(),
    },
  });

  return NextResponse.json({ result });
}
