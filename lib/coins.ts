import { db } from "@/lib/db";

/**
 * Moeda própria da Loja de Personagens do Universo AS (01/10) - separada de
 * propósito do XP/Ranking (ver comentário de CoinEntry em
 * prisma/schema.prisma): gastar moeda aqui nunca muda a posição de
 * ninguém no Ranking, mesmo a moeda sendo creditada no mesmo momento e
 * valor que o XP (ver os call sites de awardCoins: complete/route.ts e os
 * 4 progress/route.ts do arcade).
 */

/**
 * Garante que existe um UniverseProfile pra esse e-mail - mesmo padrão
 * usado em lib/cards.ts e lib/characters.ts (ensureProfile duplicado de
 * propósito em cada lib, convenção já estabelecida no projeto).
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

/** Credita moeda (amount > 0) pra um e-mail. Não faz nada se amount <= 0. */
export async function awardCoins(email: string, amount: number, reason: string) {
  if (amount <= 0) return;
  await ensureProfile(email);
  await db.coinEntry.create({ data: { email, amount, reason } });
}

/** Saldo atual = soma de todos os lançamentos (créditos e débitos). */
export async function getCoinBalance(email: string): Promise<number> {
  const agg = await db.coinEntry.aggregate({ where: { email }, _sum: { amount: true } });
  return agg._sum.amount ?? 0;
}
