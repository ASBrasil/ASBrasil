import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { ARENAS, ARENA_ORDER, evaluateBlastArenaResult, isArenaId } from "@/lib/blast-arena";
import { awardCoins } from "@/lib/coins";

/**
 * Progresso do AS Blast Arena pra quem está logado - mesmo formato de
 * app/api/public/neon-maze/progress/route.ts (AS Neon Maze): sem sessão,
 * devolve todas as arenas zeradas com só a primeira desbloqueada.
 */
export async function GET() {
  const email = await getParticipantEmail();
  const rows = email
    ? await db.blastArenaProgress.findMany({ where: { email } })
    : [];
  const byArena = new Map(rows.map((r) => [r.arena, r]));

  const arenas = ARENA_ORDER.map((id, i) => {
    const cfg = ARENAS[id];
    const row = byArena.get(id);
    const previousCleared = i === 0 ? true : byArena.get(ARENA_ORDER[i - 1])?.cleared ?? false;
    return {
      id,
      name: cfg.name,
      theme: cfg.theme,
      unlocked: previousCleared,
      cleared: row?.cleared ?? false,
      stars: row?.stars ?? 0,
      bestScore: row?.bestScore ?? 0,
      bestTimeMs: row?.bestTimeMs ?? null,
    };
  });

  return NextResponse.json({ arenas });
}

/** Salva o resultado de uma arena jogada até o fim (todos os inimigos derrotados ou perdeu todas as vidas). */
export async function POST(req: NextRequest) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const arena = body.arena;
  if (!isArenaId(arena)) return NextResponse.json({ error: "Arena inválida" }, { status: 400 });

  const cfg = ARENAS[arena];
  // Mesma trava de sequência de app/api/public/neon-maze/progress/route.ts -
  // não confia no que o cliente manda, só desbloqueia em ordem.
  const order = ARENA_ORDER.indexOf(arena);
  if (order > 0) {
    const prevId = ARENA_ORDER[order - 1];
    const prev = await db.blastArenaProgress.findUnique({ where: { email_arena: { email, arena: prevId } } });
    if (!prev?.cleared) {
      return NextResponse.json({ error: "Arena ainda bloqueada" }, { status: 403 });
    }
  }

  const outcome = evaluateBlastArenaResult(cfg, body.blocksDestroyed, body.enemiesDefeated, body.elapsedMs, body.cleared);

  const existingProfile = await db.universeProfile.findUnique({ where: { email } });
  if (!existingProfile) {
    const anyParticipant = await db.participant.findFirst({ where: { email }, orderBy: { createdAt: "asc" } });
    await db.universeProfile.create({ data: { email, displayName: anyParticipant?.name ?? null } });
  }

  const existing = await db.blastArenaProgress.findUnique({ where: { email_arena: { email, arena } } });

  // Moeda da Loja de Personagens (01/10) - mesmo padrão de
  // app/api/public/arcade/progress/route.ts: só a melhora no bestScore.
  const scoreDelta = Math.max(0, outcome.score - (existing?.bestScore ?? 0));
  if (scoreDelta > 0) await awardCoins(email, scoreDelta, `blastarena:${arena}`);

  const saved = await db.blastArenaProgress.upsert({
    where: { email_arena: { email, arena } },
    create: {
      email,
      arena,
      cleared: outcome.cleared,
      stars: outcome.stars,
      bestScore: outcome.score,
      bestTimeMs: outcome.cleared ? outcome.elapsedMs : null,
      attempts: 1,
    },
    update: {
      cleared: existing?.cleared || outcome.cleared,
      stars: Math.max(existing?.stars ?? 0, outcome.stars),
      bestScore: Math.max(existing?.bestScore ?? 0, outcome.score),
      bestTimeMs:
        outcome.cleared && (existing?.bestTimeMs == null || outcome.elapsedMs < existing.bestTimeMs)
          ? outcome.elapsedMs
          : existing?.bestTimeMs,
      attempts: { increment: 1 },
    },
  });

  return NextResponse.json({
    arena,
    cleared: saved.cleared,
    stars: saved.stars,
    bestScore: saved.bestScore,
    bestTimeMs: saved.bestTimeMs,
    blocksDestroyed: outcome.blocksDestroyed,
    enemiesDefeated: outcome.enemiesDefeated,
    unlockedNext: outcome.cleared ? ARENA_ORDER[order + 1] ?? null : null,
  });
}
