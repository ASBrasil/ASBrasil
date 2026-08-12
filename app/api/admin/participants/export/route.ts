import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * Streams the response instead of building one giant string, so exporting
 * 10k+ participants doesn't hold the whole CSV in memory at once.
 */
export async function GET(req: NextRequest) {
  await requireAdmin();
  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) return new Response("eventId é obrigatório", { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode("numero,nome,email,pedido,status\n"));

      const BATCH = 1000;
      let skip = 0;
      while (true) {
        const batch = await db.participant.findMany({
          where: { eventId },
          orderBy: { raffleNumber: "asc" },
          skip,
          take: BATCH,
          select: { name: true, email: true, orderNumber: true, raffleNumber: true, removedFromDraws: true },
        });
        if (batch.length === 0) break;

        const lines = batch
          .map((p) =>
            [
              p.raffleNumber,
              csvEscape(p.name),
              csvEscape(p.email),
              csvEscape(p.orderNumber ?? ""),
              p.removedFromDraws ? "removido" : "ativo",
            ].join(",")
          )
          .join("\n");
        controller.enqueue(encoder.encode(lines + "\n"));

        skip += BATCH;
        if (batch.length < BATCH) break;
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="participantes.csv"`,
    },
  });
}

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
