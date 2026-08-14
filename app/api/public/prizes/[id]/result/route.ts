import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const email = await getParticipantEmail();
  if (!email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const result = await db.drawResult.findFirst({
    where: { prizeId: params.id, voided: false },
    include: { participant: { select: { name: true } } },
  });

  if (!result) {
    return NextResponse.json({ result: null });
  }

  return NextResponse.json({
    result: {
      winningNumber: result.winningNumber,
      winnerName: result.participant.name,
    },
  });
}