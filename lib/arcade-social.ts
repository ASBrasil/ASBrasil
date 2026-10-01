import { db } from "@/lib/db";
import type { ArcadeGameId } from "@/lib/arcade";
import { ARCADE_GAME_IDS, ARCADE_GAME_NAMES } from "@/lib/arcade";

export { ARCADE_GAME_IDS, ARCADE_GAME_NAMES };
export type { ArcadeGameId };

/**
 * Mesma ideia de labelFor em lib/ranking.ts (não importado direto pra não
 * criar uma dependência cruzada desnecessária entre os dois arquivos):
 * mostra o apelido do Universo AS quando a pessoa tem um configurado,
 * senão um e-mail mascarado - nunca expõe o e-mail inteiro de ninguém.
 */
export function labelFor(email: string, displayName?: string | null) {
  if (displayName && displayName.trim()) return displayName.trim();
  const local = email.split("@")[0] ?? email;
  return local.length <= 3 ? `${local}***` : `${local.slice(0, 3)}***`;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I, evita confusão na hora de digitar

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return code;
}

export function isArcadeGameId(value: unknown): value is ArcadeGameId {
  return typeof value === "string" && (ARCADE_GAME_IDS as readonly string[]).includes(value);
}

/**
 * Garante que a pessoa tem uma UniverseProfile (mesmo padrão usado em toda
 * rota progress/route.ts do arcade) - necessário aqui porque amizade/sala
 * têm FK pra UniverseProfile, e uma pessoa pode nunca ter aberto nenhum
 * jogo do arcade antes de usar a camada social.
 */
export async function ensureUniverseProfile(email: string) {
  const existing = await db.universeProfile.findUnique({ where: { email } });
  if (existing) return existing;
  const anyParticipant = await db.participant.findFirst({ where: { email }, orderBy: { createdAt: "asc" } });
  return db.universeProfile.create({ data: { email, displayName: anyParticipant?.name ?? null } });
}

/**
 * Placar de uma sala: nunca guardado em ArcadeRoomPlayer, sempre recalculado
 * ao vivo a partir da tabela de progresso real do jogo daquela sala - a
 * mesma soma de bestScore que já entra no Ranking geral (ver
 * getArcadeXpByEmail/getCityRunXpByEmail/getNeonMazeXpByEmail/
 * getBlastArenaXpByEmail em lib/ranking.ts), só escopada aos e-mails da
 * sala em vez de todo mundo. Compara "quem manda melhor nesse jogo",
 * somando todas as fases/mundos/arenas já liberadas - não é uma pontuação
 * de uma "rodada" específica, é assíncrono por natureza (ver comentário no
 * schema.prisma).
 */
export async function getRoomScoreboard(gameId: ArcadeGameId, emails: string[]): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  if (emails.length === 0) return scores;
  for (const email of emails) scores.set(email, 0);

  if (gameId === "world") {
    const grouped = await db.arcadeProgress.groupBy({ by: ["email"], where: { email: { in: emails } }, _sum: { bestScore: true } });
    for (const g of grouped) scores.set(g.email, g._sum.bestScore ?? 0);
  } else if (gameId === "run") {
    const grouped = await db.cityRunProgress.groupBy({ by: ["email"], where: { email: { in: emails } }, _sum: { bestScore: true } });
    for (const g of grouped) scores.set(g.email, g._sum.bestScore ?? 0);
  } else if (gameId === "maze") {
    const grouped = await db.neonMazeProgress.groupBy({ by: ["email"], where: { email: { in: emails } }, _sum: { bestScore: true } });
    for (const g of grouped) scores.set(g.email, g._sum.bestScore ?? 0);
  } else if (gameId === "blast") {
    const grouped = await db.blastArenaProgress.groupBy({ by: ["email"], where: { email: { in: emails } }, _sum: { bestScore: true } });
    for (const g of grouped) scores.set(g.email, g._sum.bestScore ?? 0);
  }
  return scores;
}

export interface RoomPlayerView {
  email: string;
  label: string;
  avatarUrl: string | null;
  ready: boolean;
  isHost: boolean;
  score: number;
}

/** Monta a lista de jogadores de uma sala já com rótulo/avatar/placar, ordenada por pontuação. */
export async function buildRoomPlayers(roomId: string, gameId: ArcadeGameId, hostEmail: string): Promise<RoomPlayerView[]> {
  const players = await db.arcadeRoomPlayer.findMany({
    where: { roomId },
    orderBy: { joinedAt: "asc" },
    include: { profile: { include: { avatarCharacter: { select: { imageUrl: true } } } } },
  });
  const scores = await getRoomScoreboard(gameId, players.map((p) => p.email));
  return players
    .map((p) => ({
      email: p.email,
      label: labelFor(p.email, p.profile.displayName),
      avatarUrl: p.profile.avatarCharacter?.imageUrl ?? p.profile.avatarUrl ?? null,
      ready: p.ready,
      isHost: p.email === hostEmail,
      score: scores.get(p.email) ?? 0,
    }))
    .sort((a, b) => b.score - a.score);
}
