import { db } from "@/lib/db";

/**
 * Garante que existe um UniverseProfile pra esse e-mail antes de conceder
 * qualquer personagem - mesmo padrão usado em lib/cards.ts::ensureProfile.
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

/** Concede um personagem a um e-mail, sem duplicar se ele já tiver. */
export async function grantCharacter(email: string, characterId: string) {
  await ensureProfile(email);
  await db.playerCharacter.upsert({
    where: { email_characterId: { email, characterId } },
    create: { email, characterId },
    update: {},
  });
}

/**
 * Se a pessoa ainda não tiver um avatar escolhido (nem personagem, nem foto
 * livre), usa automaticamente o primeiro personagem que ela ganhar como
 * avatar - assim quem nunca abriu /perfil pra escolher já aparece com uma
 * miniatura decente no Ranking em vez do placeholder genérico. Nunca
 * sobrescreve uma escolha que a pessoa já fez (personagem OU foto).
 */
async function autoSelectAvatarIfEmpty(email: string, characterId: string) {
  const profile = await db.universeProfile.findUnique({
    where: { email },
    select: { avatarCharacterId: true, avatarUrl: true },
  });
  if (!profile || profile.avatarCharacterId || profile.avatarUrl) return;
  await db.universeProfile.update({ where: { email }, data: { avatarCharacterId: characterId } });
}

/**
 * Gatilho automático: completar uma fase com nota máxima concede o
 * personagem configurado como `GamePhase.rewardCharacterId` - mesma
 * condição (isPerfect) e mesmo ponto de chamada de rewardCardId, na rota
 * games/phases/[phaseId]/complete/route.ts.
 */
export async function grantPhaseRewardCharacter(email: string, characterId: string) {
  await grantCharacter(email, characterId);
  await autoSelectAvatarIfEmpty(email, characterId);
}
