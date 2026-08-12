import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createParticipantSession } from "@/lib/participant-session";

const attempts = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function isRateLimited(key: string) {
  const now = Date.now();
  const history = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  history.push(now);
  attempts.set(key, history);
  return history.length > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "E-mail é obrigatório" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429 }
    );
  }

  const normalized = String(email).trim().toLowerCase();
  const participant = await db.participant.findFirst({
    where: { email: normalized, event: { active: true } },
  });

  if (!participant) {
    return NextResponse.json({
      found: false,
      message: "Não encontramos esse e-mail em nenhum sorteio ativo.",
    });
  }

  await createParticipantSession(normalized);
  return NextResponse.json({ found: true });
}
