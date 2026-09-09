import { db } from "@/lib/db";

export interface RankingEntry {
  rank: number;
  email: string;
  label: string;
  xp: number;
}

/**
 * Nome mostrado no ranking pra outras pessoas: usa o apelido do Universo AS
 * quando a pessoa configurou um (UniverseProfile.displayName); senão mostra
 * só o começo do e-mail mascarado, pra não expor o e-mail inteiro de
 * ninguém num ranking público.
 */
function labelFor(email: string, displayName: string | null | undefined) {
  if (displayName && displayName.trim()) return displayName.trim();
  const local = email.split("@")[0] ?? email;
  return local.length <= 3 ? `${local}***` : `${local.slice(0, 3)}***`;
}

async function withLabels(
  grouped: { email: string; _sum: { firstScore: number | null } }[]
): Promise<RankingEntry[]> {
  if (grouped.length === 0) return [];
  const profiles = await db.universeProfile.findMany({
    where: { email: { in: grouped.map((g) => g.email) } },
    select: { email: true, displayName: true },
  });
  const nameByEmail = new Map(profiles.map((p) => [p.email, p.displayName]));
  return grouped.map((g, i) => ({
    rank: i + 1,
    email: g.email,
    label: labelFor(g.email, nameByEmail.get(g.email)),
    xp: g._sum.firstScore ?? 0,
  }));
}

/** Ranking geral do Universo AS - soma de todas as fases de todos os jogos. */
export async function getGlobalRanking(limit = 100): Promise<RankingEntry[]> {
  const grouped = await db.playerPhaseProgress.groupBy({
    by: ["email"],
    _sum: { firstScore: true },
    orderBy: { _sum: { firstScore: "desc" } },
    take: limit,
  });
  return withLabels(grouped);
}

/**
 * Ranking de uma Experience específica - soma só das fases de jogos cujo
 * evento está vinculado a essa experiência (Game -> Event.experienceId).
 */
export async function getExperienceRanking(experienceId: string, limit = 100): Promise<RankingEntry[]> {
  const grouped = await db.playerPhaseProgress.groupBy({
    by: ["email"],
    where: { phase: { game: { event: { experienceId } } } },
    _sum: { firstScore: true },
    orderBy: { _sum: { firstScore: "desc" } },
    take: limit,
  });
  return withLabels(grouped);
}

/** Ranking de um jogo específico - soma só das fases daquele jogo. */
export async function getGameRanking(gameId: string, limit = 100): Promise<RankingEntry[]> {
  const grouped = await db.playerPhaseProgress.groupBy({
    by: ["email"],
    where: { phase: { gameId } },
    _sum: { firstScore: true },
    orderBy: { _sum: { firstScore: "desc" } },
    take: limit,
  });
  return withLabels(grouped);
}

/** XP total (mesma soma usada nos rankings) de uma única pessoa. */
export async function getTotalXp(email: string): Promise<number> {
  const agg = await db.playerPhaseProgress.aggregate({
    where: { email },
    _sum: { firstScore: true },
  });
  return agg._sum.firstScore ?? 0;
}
