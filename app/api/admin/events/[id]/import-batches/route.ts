import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const batches = await db.importBatch.findMany({
    where: { eventId: params.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      filename: true,
      totalRows: true,
      validRows: true,
      errorRows: true,
      status: true,
      createdAt: true,
      finishedAt: true,
    },
  });
  return NextResponse.json({ batches });
}
