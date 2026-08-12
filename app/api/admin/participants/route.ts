import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const PAGE_SIZE = 50;

/**
 * Always paginated server-side and never returns the full participant list
 * in one response - that's the whole point of the "10k+ participants
 * without the UI going slow" requirement. Search runs against indexed
 * columns (eventId is indexed; name/email use a bounded `contains` so it
 * stays fast even before adding a full-text index).
 */
export async function GET(req: NextRequest) {
  await requireAdmin();

  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId é obrigatório" }, { status: 400 });

  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));

  const where = {
    eventId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { orderNumber: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, participants] = await Promise.all([
    db.participant.count({ where }),
    db.participant.findMany({
      where,
      orderBy: { raffleNumber: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        orderNumber: true,
        raffleNumber: true,
        source: true,
        removedFromDraws: true,
      },
    }),
  ]);

  return NextResponse.json({
    participants,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}
