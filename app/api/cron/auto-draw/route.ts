import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { performDraw } from "@/lib/drawEngine";

/**
 * Called by Vercel Cron (see vercel.json) - never by a browser or an admin
 * action. Verifies the request came from Vercel's scheduler via
 * CRON_SECRET (auto-provisioned by Vercel, no manual setup needed) before
 * doing anything, since this route has no session/login of its own to
 * protect it otherwise.
 *
 * Finds every prize that's still PENDING, has autoDraw on, and whose
 * scheduledAt has already passed, and draws each one - reusing the exact
 * same performDraw() the manual "Sortear agora" button calls, so the
 * audit trail and winner-removal policy behave identically either way.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const duePrizes = await db.prize.findMany({
    where: {
      autoDraw: true,
      status: "PENDING",
      scheduledAt: { lte: new Date() },
    },
    select: { id: true, name: true },
  });

  const results = [];
  for (const prize of duePrizes) {
    const outcome = await performDraw(prize.id, { automatic: true });
    results.push({
      prizeId: prize.id,
      prizeName: prize.name,
      ...("error" in outcome ? { error: outcome.error } : { winningNumber: outcome.result.winningNumber }),
    });
  }

  return NextResponse.json({ checkedAt: new Date().toISOString(), processed: results.length, results });
}
