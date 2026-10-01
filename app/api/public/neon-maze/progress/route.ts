import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { WORLDS, WORLD_ORDER, evaluateNeonMazeResult, isWorldId } from "@/lib/neon-maze";
import { awardCoins } from "@/lib/coins";

/**
 * Progresso do AS Neon Maze pra quem está logado - mesmo formato de
 * app/api/public/city-run/progress/route.ts (AS City Run): sem sessão,
 * devolve todos os mundos zerados com só o primeiro desbloqueado.
 */
export async function GET() {
  const email = await getParticipantEmail();
  const rows = email
    ? await db.neonMazeProgress.findMany({ where: { email } })
    : [];
  const byWorld = new Map(rows.map((r) => [r.world, r]));

  const worlds = WORLD_ORDER.map((id, i) => {
    const cfg = WORLDS[id];
    const row = byWorld.get(id);
    const previousCleared = i === 0 ? true : byWorld.get(WORLD_ORDER[i - 1])?.cleared ?? false;
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

  return NextResponse.json({ worlds });
}

/** Salva o resultado de um mundo jogado até o fim (chegou na saída ou perdeu todas as vidas). */
export async function POST(req: NextRequest) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const world = body.world;
  if (!isWorldId(world)) return NextResponse.json({ error: "Mundo inválido" }, { status: 400 });

  const cfg = WORLDS[world];
  // Mesma trava de sequência de app/api/public/city-run/progress/route.ts -
  // não confia no que o cliente manda, só desbloqueia em ordem.
  const order = WORLD_ORDER.indexOf(world);
  if (order > 0) {
    const prevId = WORLD_ORDER[order - 1];
    const prev = await db.neonMazeProgress.findUnique({ where: { email_world: { email, world: prevId } } });
    if (!prev?.cleared) {
      return NextResponse.json({ error: "Mundo ainda bloqueado" }, { status: 403 });
    }
  }

  const outcome = evaluateNeonMazeResult(cfg, body.dots, body.elapsedMs, body.cleared);

  const existingProfile = await db.universeProfile.findUnique({ where: { email } });
  if (!existingProfile) {
    const anyParticipant = await db.participant.findFirst({ where: { email }, orderBy: { createdAt: "asc" } });
    await db.universeProfile.create({ data: { email, displayName: anyParticipant?.name ?? null } });
  }

  const existing = await db.neonMazeProgress.findUnique({ where: { email_world: { email, world } } });

  // Moeda da Loja de Personagens (01/10) - mesmo padrão de
  // app/api/public/arcade/progress/route.ts: só a melhora no bestScore.
  const scoreDelta = Math.max(0, outcome.score - (existing?.bestScore ?? 0));
  if (scoreDelta > 0) await awardCoins(email, scoreDelta, `neonmaze:${world}`);

  const saved = await db.neonMazeProgress.upsert({
    where: { email_world: { email, world } },
    create: {
      email,
      world,
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
    world,
    cleared: saved.cleared,
    stars: saved.stars,
    bestScore: saved.bestScore,
    bestTimeMs: saved.bestTimeMs,
    dots: outcome.dots,
    unlockedNext: outcome.cleared ? WORLD_ORDER[order + 1] ?? null : null,
  });
}
