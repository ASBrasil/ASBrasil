import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * In-memory sliding-window limiter. Fine for a single instance; swap for a
 * Redis-backed limiter (e.g. Upstash) once this runs on more than one node,
 * since the whole point is to stop someone from brute-forcing other
 * people's numbers by hammering this endpoint.
 */
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
  const { slug, email } = await req.json();
  if (!slug || !email) {
    return NextResponse.json({ error: "slug e email são obrigatórios" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`${ip}:${slug}`)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429 }
    );
  }

  const event = await db.event.findUnique({ where: { slug } });
  if (!event) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });

  // findFirst, not findUnique: e-mail is no longer unique per event (one
  // buyer can hold several tickets), so this returns whichever entry comes
  // first. This endpoint is legacy/unused (see README) - kept working
  // rather than left to crash if anything ever calls it again.
  const participant = await db.participant.findFirst({
    where: { eventId: event.id, email: String(email).trim().toLowerCase() },
    select: { name: true, raffleNumber: true },
  });

  // Same generic response whether the email exists or not, so this endpoint
  // can't be used to confirm which emails are registered.
  if (!participant) {
    return NextResponse.json(
      { found: false, message: "Não encontramos esse e-mail nesta campanha." }
    );
  }

  return NextResponse.json({
    found: true,
    name: participant.name,
    raffleNumber: participant.raffleNumber,
  });
}
