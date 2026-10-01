import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { ROUTES, ROUTE_ORDER, evaluateCityRunResult, isRouteId } from "@/lib/city-run";
import { awardCoins } from "@/lib/coins";

/**
 * Progresso do AS City Run pra quem está logado - mesmo formato de
 * app/api/public/arcade/progress/route.ts (AS World Adventure): sem sessão,
 * devolve todas as rotas zeradas com só a primeira desbloqueada.
 */
export async function GET() {
  const email = await getParticipantEmail();
  const rows = email
    ? await db.cityRunProgress.findMany({ where: { email } })
    : [];
  const byRoute = new Map(rows.map((r) => [r.route, r]));

  const routes = ROUTE_ORDER.map((id, i) => {
    const cfg = ROUTES[id];
    const row = byRoute.get(id);
    const previousCleared = i === 0 ? true : byRoute.get(ROUTE_ORDER[i - 1])?.cleared ?? false;
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

  return NextResponse.json({ routes });
}

/** Salva o resultado de uma rota jogada até o fim (chegou ou perdeu todas as vidas). */
export async function POST(req: NextRequest) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const route = body.route;
  if (!isRouteId(route)) return NextResponse.json({ error: "Rota inválida" }, { status: 400 });

  const cfg = ROUTES[route];
  // Mesma trava de sequência de app/api/public/arcade/progress/route.ts -
  // não confia no que o cliente manda, só desbloqueia em ordem.
  const order = ROUTE_ORDER.indexOf(route);
  if (order > 0) {
    const prevId = ROUTE_ORDER[order - 1];
    const prev = await db.cityRunProgress.findUnique({ where: { email_route: { email, route: prevId } } });
    if (!prev?.cleared) {
      return NextResponse.json({ error: "Rota ainda bloqueada" }, { status: 403 });
    }
  }

  const outcome = evaluateCityRunResult(cfg, body.coins, body.elapsedMs, body.cleared);

  const existingProfile = await db.universeProfile.findUnique({ where: { email } });
  if (!existingProfile) {
    const anyParticipant = await db.participant.findFirst({ where: { email }, orderBy: { createdAt: "asc" } });
    await db.universeProfile.create({ data: { email, displayName: anyParticipant?.name ?? null } });
  }

  const existing = await db.cityRunProgress.findUnique({ where: { email_route: { email, route } } });

  // Moeda da Loja de Personagens (01/10) - mesmo padrão de
  // app/api/public/arcade/progress/route.ts: só a melhora no bestScore.
  const scoreDelta = Math.max(0, outcome.score - (existing?.bestScore ?? 0));
  if (scoreDelta > 0) await awardCoins(email, scoreDelta, `cityrun:${route}`);

  const saved = await db.cityRunProgress.upsert({
    where: { email_route: { email, route } },
    create: {
      email,
      route,
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
    route,
    cleared: saved.cleared,
    stars: saved.stars,
    bestScore: saved.bestScore,
    bestTimeMs: saved.bestTimeMs,
    coins: outcome.coins,
    unlockedNext: outcome.cleared ? ROUTE_ORDER[order + 1] ?? null : null,
  });
}
