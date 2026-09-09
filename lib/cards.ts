import { db } from "@/lib/db";

/**
 * Garante que existe um UniverseProfile pra esse e-mail antes de conceder
 * qualquer carta - mesmo padrão já usado em games/phases/[phaseId]/complete:
 * a pessoa pode ganhar uma figurinha antes de nunca ter jogado nada
 * (ex: só de se inscrever num sorteio), então o perfil precisa existir.
 */
async function ensureProfile(email: string) {
  const existing = await db.universeProfile.findUnique({ where: { email } });
  if (existing) return;
  const participant = await db.participant.findFirst({
    where: { email },
    orderBy: { createdAt: "asc" },
  });
  await db.universeProfile.create({ data: { email, displayName: participant?.name ?? null } });
}

/** Concede uma carta a um e-mail, sem duplicar se ele já tiver. */
export async function grantCard(email: string, cardId: string) {
  await ensureProfile(email);
  await db.playerCard.upsert({
    where: { email_cardId: { email, cardId } },
    create: { email, cardId },
    update: {},
  });
}

/**
 * Gatilho automático 1: inscrição num sorteio. Chamado toda vez que alguém
 * se inscreve (ou revisita a inscrição) num evento - concede toda carta que
 * tiver esse evento configurado como `unlockEventId`. Idempotente (upsert),
 * então chamar de novo pra quem já ganhou não tem efeito colateral.
 */
export async function grantEventUnlockCards(eventId: string, email: string) {
  const cards = await db.gameCard.findMany({ where: { unlockEventId: eventId } });
  for (const card of cards) await grantCard(email, card.id);
}

/**
 * Gatilho automático 2: 100% de um jogo. Chamado toda vez que uma fase é
 * concluída - se, somando essa conclusão, TODAS as fases do jogo estiverem
 * com nota máxima (completed + firstScore igual aos pontos da fase),
 * concede a(s) carta(s) configuradas com esse jogo como `unlockGameId`.
 * Sai cedo se o jogo não tiver nenhuma carta configurada, pra não gastar
 * consulta à toa em jogos que não usam esse recurso.
 */
export async function grantGamePerfectCards(gameId: string, email: string) {
  const cards = await db.gameCard.findMany({ where: { unlockGameId: gameId } });
  if (cards.length === 0) return;

  const phases = await db.gamePhase.findMany({
    where: { gameId },
    select: { id: true, points: true },
  });
  if (phases.length === 0) return;

  const progress = await db.playerPhaseProgress.findMany({
    where: { email, phaseId: { in: phases.map((p: { id: string }) => p.id) } },
  });
  const byPhase = new Map<string, { completed: boolean; firstScore: number }>(
    progress.map((p: { phaseId: string; completed: boolean; firstScore: number }) => [p.phaseId, p])
  );

  const allPerfect = phases.every((p: { id: string; points: number }) => {
    const row = byPhase.get(p.id);
    return !!row && row.completed && row.firstScore >= p.points;
  });
  if (!allPerfect) return;

  for (const card of cards) await grantCard(email, card.id);
}