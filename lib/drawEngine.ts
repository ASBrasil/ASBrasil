import { db } from "@/lib/db";
import { drawWinner } from "@/lib/raffle";

/**
 * Shared by both the admin's "Sortear agora" button and the automatic-draw
 * cron job - same logic, same transaction, same audit trail either way.
 * The only difference is who's calling: a logged-in admin (adminId set,
 * automatic false) or the cron job (adminId null, automatic true).
 */
export async function performDraw(
  prizeId: string,
  options: { adminId?: string | null; automatic?: boolean } = {}
) {
  const prize = await db.prize.findUnique({ where: { id: prizeId }, include: { event: true } });
  if (!prize) return { error: "Prêmio não encontrado", status: 404 as const };
  if (prize.status === "DRAWN") {
    return {
      error: "Este prêmio já foi sorteado. Use /redo para invalidar e sortear novamente.",
      status: 409 as const,
    };
  }

  const eligible = await db.participant.findMany({
    where: { eventId: prize.eventId, removedFromDraws: false },
    select: { id: true, raffleNumber: true },
  });

  if (eligible.length === 0) {
    return { error: "Nenhum participante elegível", status: 422 as const };
  }

  const outcome = drawWinner(eligible);

  const result = await db.$transaction(async (tx) => {
    const drawResult = await tx.drawResult.create({
      data: {
        prizeId: prize.id,
        participantId: outcome.winner.id,
        winningNumber: outcome.winner.raffleNumber,
        eligibleCount: outcome.eligibleCount,
        rngSeed: outcome.rngSeed,
        drawnByAdminId: options.adminId ?? null,
        drawnAutomatically: options.automatic ?? false,
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

  return { result };
}
