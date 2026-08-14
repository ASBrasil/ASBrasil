import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const batch = await db.importBatch.findUnique({ where: { id: params.id } });
  if (!batch) return NextResponse.json({ error: "Importação não encontrada" }, { status: 404 });
  return NextResponse.json({ batch });
}
