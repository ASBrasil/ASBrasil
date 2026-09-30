import { db } from "@/lib/db";

export interface RankingEntry {
  rank: number;
  email: string;
  label: string;
  xp: number;
  avatarUrl: string | null;
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
    select: {
      email: true,
      displayName: true,
      avatarUrl: true,
      avatarCharacter: { select: { imageUrl: true } },
    },
  });
  const profileByEmail = new Map(profiles.map((p) => [p.email, p]));
  return grouped.map((g, i) => {
    const profile = profileByEmail.get(g.email);
    // Avatar de personagem (quando escolhido) tem precedência sobre a foto
    // livre - mesma regra aplicada em /perfil, ver CharacterAvatarPicker.
    const avatarUrl = profile?.avatarCharacter?.imageUrl ?? profile?.avatarUrl ?? null;
    return {
      rank: i + 1,
      email: g.email,
      label: labelFor(g.email, profile?.displayName),
      xp: g._sum.firstScore ?? 0,
      avatarUrl,
    };
  });
}

/**
 * Soma de bestScore do AS World Adventure (hub /universo-as/arcade) por
 * e-mail - separado do PlayerPhaseProgress porque essa tabela não é uma
 * GamePhase de sorteio (ver prisma/schema.prisma::ArcadeProgress). Só entra
 * no Ranking geral do Universo AS, nunca nos rankings por Experience/jogo
 * (esses são escopados a fases de um evento específico).
 */
async function getArcadeXpByEmail(): Promise<Map<string, number>> {
  const grouped = await db.arcadeProgress.groupBy({
    by: ["email"],
    _sum: { bestScore: true },
  });
  return new Map(grouped.map((g) => [g.email, g._sum.bestScore ?? 0]));
}

/** Mesma ideia de getArcadeXpByEmail, pro AS City Run (ver CityRunProgress). */
async function getCityRunXpByEmail(): Promise<Map<string, number>> {
  const grouped = await db.cityRunProgress.groupBy({
    by: ["email"],
    _sum: { bestScore: true },
  });
  return new Map(grouped.map((g) => [g.email, g._sum.bestScore ?? 0]));
}

/** Mesma ideia de getArcadeXpByEmail, pro AS Neon Maze (ver NeonMazeProgress). */
async function getNeonMazeXpByEmail(): Promise<Map<string, number>> {
  const grouped = await db.neonMazeProgress.groupBy({
    by: ["email"],
    _sum: { bestScore: true },
  });
  return new Map(grouped.map((g) => [g.email, g._sum.bestScore ?? 0]));
}

/** Mesma ideia de getArcadeXpByEmail, pro AS Blast Arena (ver BlastArenaProgress). */
async function getBlastArenaXpByEmail(): Promise<Map<string, number>> {
  const grouped = await db.blastArenaProgress.groupBy({
    by: ["email"],
    _sum: { bestScore: true },
  });
  return new Map(grouped.map((g) => [g.email, g._sum.bestScore ?? 0]));
}

/** Ranking geral do Universo AS - soma de todas as fases de todos os jogos + arcade (World Adventure + City Run + Neon Maze + Blast Arena). */
export async function getGlobalRanking(limit = 100): Promise<RankingEntry[]> {
  const [phaseGrouped, arcadeByEmail, cityRunByEmail, neonMazeByEmail, blastArenaByEmail] = await Promise.all([
    db.playerPhaseProgress.groupBy({ by: ["email"], _sum: { firstScore: true } }),
    getArcadeXpByEmail(),
    getCityRunXpByEmail(),
    getNeonMazeXpByEmail(),
    getBlastArenaXpByEmail(),
  ]);

  const totalByEmail = new Map<string, number>();
  const addXp = (email: string, xp: number) => totalByEmail.set(email, (totalByEmail.get(email) ?? 0) + xp);
  for (const g of phaseGrouped) addXp(g.email, g._sum.firstScore ?? 0);
  for (const [email, arcadeXp] of arcadeByEmail) addXp(email, arcadeXp);
  for (const [email, cityRunXp] of cityRunByEmail) addXp(email, cityRunXp);
  for (const [email, neonMazeXp] of neonMazeByEmail) addXp(email, neonMazeXp);
  for (const [email, blastArenaXp] of blastArenaByEmail) addXp(email, blastArenaXp);

  const merged = [...totalByEmail.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([email, sum]) => ({ email, _sum: { firstScore: sum } }));

  return withLabels(merged);
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

/** XP total (mesma soma usada no Ranking geral, incluindo o arcade) de uma única pessoa. */
export async function getTotalXp(email: string): Promise<number> {
  const [agg, arcadeAgg, cityRunAgg, neonMazeAgg, blastArenaAgg] = await Promise.all([
    db.playerPhaseProgress.aggregate({ where: { email }, _sum: { firstScore: true } }),
    db.arcadeProgress.aggregate({ where: { email }, _sum: { bestScore: true } }),
    db.cityRunProgress.aggregate({ where: { email }, _sum: { bestScore: true } }),
    db.neonMazeProgress.aggregate({ where: { email }, _sum: { bestScore: true } }),
    db.blastArenaProgress.aggregate({ where: { email }, _sum: { bestScore: true } }),
  ]);
  return (
    (agg._sum.firstScore ?? 0) +
    (arcadeAgg._sum.bestScore ?? 0) +
    (cityRunAgg._sum.bestScore ?? 0) +
    (neonMazeAgg._sum.bestScore ?? 0) +
    (blastArenaAgg._sum.bestScore ?? 0)
  );
}

// --- Painel de Ranking do admin (Fase 3) -----------------------------------

export interface RankingScope {
  gameId?: string;
  eventId?: string;
  since?: Date;
  until?: Date;
}

export interface RankingSummary {
  totalPlayers: number;
  avgScore: number;
  topScore: number;
  completedPhases: number;
}

function scopeWhere(scope: RankingScope) {
  const where: Record<string, unknown> = {};
  if (scope.gameId) {
    where.phase = { gameId: scope.gameId };
  } else if (scope.eventId) {
    where.phase = { game: { eventId: scope.eventId } };
  }
  if (scope.since || scope.until) {
    where.createdAt = {
      ...(scope.since ? { gte: scope.since } : {}),
      ...(scope.until ? { lte: scope.until } : {}),
    };
  }
  return where;
}

export async function getScopedRanking(scope: RankingScope = {}, limit = 100): Promise<RankingEntry[]> {
  const grouped = await db.playerPhaseProgress.groupBy({
    by: ["email"],
    where: scopeWhere(scope),
    _sum: { firstScore: true },
    orderBy: { _sum: { firstScore: "desc" } },
    take: limit,
  });
  return withLabels(grouped);
}

export async function getRankingSummary(scope: RankingScope = {}): Promise<RankingSummary> {
  const where = scopeWhere(scope);
  const [grouped, completedPhases] = await Promise.all([
    db.playerPhaseProgress.groupBy({
      by: ["email"],
      where,
      _sum: { firstScore: true },
    }),
    db.playerPhaseProgress.count({ where: { ...where, completed: true } }),
  ]);
  const scores = grouped.map((g) => g._sum.firstScore ?? 0);
  const totalPlayers = grouped.length;
  const totalXp = scores.reduce((a, b) => a + b, 0);
  return {
    totalPlayers,
    avgScore: totalPlayers ? Math.round(totalXp / totalPlayers) : 0,
    topScore: scores.length ? Math.max(...scores) : 0,
    completedPhases,
  };
}
