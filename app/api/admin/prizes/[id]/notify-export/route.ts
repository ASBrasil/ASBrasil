import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * CSV de quem pediu aviso quando esse prêmio surpresa revelar. Não envia
 * nada - é só a lista pro admin importar no Brevo (ou onde preferir) e
 * disparar o aviso manualmente quando decidir revelar.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();

  const prize = await db.prize.findUnique({ where: { id: params.id } });
  if (!prize) return NextResponse.json({ error: "Prêmio não encontrado" }, { status: 404 });

  const requests = await db.prizeNotifyRequest.findMany({
    where: { prizeId: prize.id },
    orderBy: { createdAt: "asc" },
  });

  const lines = ["email,pedido_em"];
  for (const r of requests) {
    lines.push(`${csvEscape(r.email)},${r.createdAt.toISOString()}`);
  }

  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="interessados-${prize.id}.csv"`,
    },
  });
}

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
