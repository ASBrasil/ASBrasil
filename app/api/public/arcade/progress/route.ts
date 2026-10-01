import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { CITIES, CITY_ORDER, evaluateArcadeResult, isCityId } from "@/lib/arcade";
import { awardCoins } from "@/lib/coins";

/**
 * Progresso do AS World Adventure pra quem está logado. Sem sessão, devolve
 * todas as cidades zeradas com só a primeira desbloqueada - a tela de
 * seleção do hub usa esse mesmo formato tanto logado quanto anônimo (jogar
 * sem estar identificado funciona, só não persiste nada, igual os outros 3
 * jogos do arcade).
 */
export async function GET() {
  const email = await getParticipantEmail();
  const rows = email
    ? await db.arcadeProgress.findMany({ where: { email } })
    : [];
  const byCity = new Map(rows.map((r) => [r.city, r]));

  const cities = CITY_ORDER.map((id, i) => {
    const cfg = CITIES[id];
    const row = byCity.get(id);
    const previousCleared = i === 0 ? true : byCity.get(CITY_ORDER[i - 1])?.cleared ?? false;
    return {
      id,
      name: cfg.name,
      playable: cfg.playable,
      unlocked: previousCleared,
      cleared: row?.cleared ?? false,
      stars: row?.stars ?? 0,
      bestScore: row?.bestScore ?? 0,
      bestTimeMs: row?.bestTimeMs ?? null,
    };
  });

  return NextResponse.json({ cities });
}

/** Salva o resultado de uma cidade jogada até o fim (vitória ou derrota). */
export async function POST(req: NextRequest) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const city = body.city;
  if (!isCityId(city)) return NextResponse.json({ error: "Cidade inválida" }, { status: 400 });

  const cfg = CITIES[city];
  // Cidade seguinte só pode ser reportada se a anterior já estiver
  // vencida - mesmo raciocínio de "não confiar no que o cliente manda"
  // aplicado aqui: mesmo que alguém force a chamada, não desbloqueia fora
  // de ordem.
  const order = CITY_ORDER.indexOf(city);
  if (order > 0) {
    const prevId = CITY_ORDER[order - 1];
    const prev = await db.arcadeProgress.findUnique({ where: { email_city: { email, city: prevId } } });
    if (!prev?.cleared) {
      return NextResponse.json({ error: "Cidade ainda bloqueada" }, { status: 403 });
    }
  }

  const outcome = evaluateArcadeResult(cfg, body.coins, body.elapsedMs, body.cleared);

  const existingProfile = await db.universeProfile.findUnique({ where: { email } });
  if (!existingProfile) {
    const anyParticipant = await db.participant.findFirst({ where: { email }, orderBy: { createdAt: "asc" } });
    await db.universeProfile.create({ data: { email, displayName: anyParticipant?.name ?? null } });
  }

  const existing = await db.arcadeProgress.findUnique({ where: { email_city: { email, city } } });

  // Moeda da Loja de Personagens (01/10) - mesmo valor do XP ganho aqui: só
  // a MELHORA no bestScore (nunca em cima do score bruto da tentativa, pra
  // não dar coin de novo jogando pior que o recorde já salvo), guardada à
  // parte do Ranking (ver lib/coins.ts).
  const scoreDelta = Math.max(0, outcome.score - (existing?.bestScore ?? 0));
  if (scoreDelta > 0) await awardCoins(email, scoreDelta, `arcade:${city}`);

  const saved = await db.arcadeProgress.upsert({
    where: { email_city: { email, city } },
    create: {
      email,
      city,
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
    city,
    cleared: saved.cleared,
    stars: saved.stars,
    bestScore: saved.bestScore,
    bestTimeMs: saved.bestTimeMs,
    coins: outcome.coins,
    unlockedNext: outcome.cleared ? CITY_ORDER[order + 1] ?? null : null,
  });
}
