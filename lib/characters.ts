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

/**
 * Esqueletos de animação prontos (ver public/game-universe/animated) - o
 * que todo Character.spriteId deveria apontar pra um destes. Exportado
 * pro admin (select de opções) e pro fallback em ArcadeUniverse.tsx.
 */
export const SPRITE_IDS = ["jhope", "jimin", "jin", "jungkook", "rm", "suga", "v"] as const;
export const DEFAULT_SPRITE_ID = "rm";

/**
 * Concede um personagem a um e-mail, sem duplicar se ele já tiver - usado
 * por TODOS os caminhos de aquisição (recompensa de fase, loja, inicial
 * grátis, concessão manual do admin), cada um passando seu próprio
 * `source` só pra fins informativos (ver PlayerCharacter.source). Também
 * tenta auto-selecionar o avatar do Ranking se a pessoa ainda não tiver
 * nenhum (ver autoSelectAvatarIfEmpty) - antes isso só acontecia no
 * caminho de recompensa, agora vale pra qualquer forma de ganhar um
 * personagem.
 */
export async function grantCharacter(email: string, characterId: string, source: string = "reward") {
  await ensureProfile(email);
  await db.playerCharacter.upsert({
    where: { email_characterId: { email, characterId } },
    create: { email, characterId, source },
    update: {},
  });
  await autoSelectAvatarIfEmpty(email, characterId);
}

/**
 * Concede de graça o(s) personagem(ns) marcado(s) como `isStarter` de uma
 * Experiência - chamado toda vez que a pessoa abre o arcade dela (ver
 * app/eventos/[slug]/arcade/page.tsx), idempotente (upsert não duplica).
 * Sem personagem inicial configurado no admin ainda, não faz nada (o
 * elenco fica vazio até o Paulo marcar um).
 */
export async function ensureStarterCharacters(email: string, experienceId: string) {
  const starters = await db.character.findMany({ where: { experienceId, isStarter: true } });
  for (const starter of starters) {
    await grantCharacter(email, starter.id, "starter");
  }
}

/**
 * Desbloqueia um personagem gastando moeda da Loja (CoinEntry) - débito e
 * concessão acontecem na mesma transação, pra um clique duplo nunca gastar
 * moeda duas vezes (mesmo cuidado de "não confiar só na UI" já aplicado em
 * outras rotas do projeto, ex: generateNumberPool).
 */
export async function unlockCharacterWithCoins(
  email: string,
  characterId: string
): Promise<
  | { ok: true; balance: number; character: { id: string; name: string; imageUrl: string | null } }
  | { ok: false; error: string }
> {
  const character = await db.character.findUnique({ where: { id: characterId } });
  if (!character) return { ok: false, error: "Personagem não encontrado." };
  if (character.pointsCost <= 0) return { ok: false, error: "Esse personagem não está à venda na loja." };

  await ensureProfile(email);

  const already = await db.playerCharacter.findUnique({
    where: { email_characterId: { email, characterId } },
  });
  if (already) return { ok: false, error: "Você já tem esse personagem." };

  const result = await db.$transaction(async (tx) => {
    const agg = await tx.coinEntry.aggregate({ where: { email }, _sum: { amount: true } });
    const balance = agg._sum.amount ?? 0;
    if (balance < character.pointsCost) return null;
    await tx.coinEntry.create({
      data: { email, amount: -character.pointsCost, reason: `unlock:${characterId}` },
    });
    await tx.playerCharacter.create({ data: { email, characterId, source: "shop" } });
    return balance - character.pointsCost;
  });

  if (result === null) return { ok: false, error: "Moedas insuficientes." };

  await autoSelectAvatarIfEmpty(email, characterId);

  return {
    ok: true,
    balance: result,
    character: { id: character.id, name: character.name, imageUrl: character.imageUrl },
  };
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
 * games/phases/[phaseId]/complete/route.ts. autoSelectAvatarIfEmpty já
 * roda dentro de grantCharacter, não precisa chamar de novo aqui.
 */
export async function grantPhaseRewardCharacter(email: string, characterId: string) {
  await grantCharacter(email, characterId, "reward");
}
