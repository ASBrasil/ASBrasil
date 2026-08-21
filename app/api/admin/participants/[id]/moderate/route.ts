import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json();
  const { status } = body;

  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
    return NextResponse.json({ error: "status inválido" }, { status: 400 });
  }

  const participant = await db.participant.update({
    where: { id: params.id },
    data: { moderationStatus: status },
  });

  return NextResponse.json({ participant });
}
