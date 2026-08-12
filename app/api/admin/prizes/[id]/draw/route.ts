import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { drawWinner } from "@/lib/raffle";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await requireAdmin();

  const prize = await db.prize.findUnique({ where: { id: params.id }, include: { event: true } });
  if (!prize) return NextResponse.json({ error: "Prêmio não encontrado" }, { status: 404 });
  if (prize.status === "DRAWN") {
    return NextResponse.json(
      { error: "Este prêmio já foi sorteado. Use /redo para invalidar e sortear novamente." },
      { status: 409 }
    );
  }

  const eligible = await db.participant.findMany({
    where: { eventId: prize.eventId, removedFromDraws: false },
    select: { id: true, raffleNumber: true },
  });

  if (eligible.length === 0) {
    return NextResponse.json({ error: "Nenhum participante elegível" }, { status: 422 });
  }

  const outcome = drawWinner(eligible);

  // Insert result + flip prize status + (optionally) mark winner ineligible,
  // all inside one transaction so a crash mid-draw can never leave the
  // prize "PENDING" with a result already recorded, or vice versa.
  const result = await db.$transaction(async (tx) => {
    const drawResult = await tx.drawResult.create({
      data: {
        prizeId: prize.id,
        participantId: outcome.winner.id,
        winningNumber: outcome.winner.raffleNumber,
        eligibleCount: outcome.eligibleCount,
        rngSeed: outcome.rngSeed,
        drawnByAdminId: adminId,
      },
      include: { participant: true },
    });

    await tx.prize.update({ where: { id: prize.id }, data: { status: "DRAWN" } });

    if (prize.event.winnerPolicy === "REMOVE") {
      await tx.participant.update({
        where: { id: outcome.winner.id },
        data: { removedFromDraws: true },
      });
    }

    return drawResult;
  });

  return NextResponse.json({ result });
}
