import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: { email: string } }) {
  await requireAdmin();
  const email = decodeURIComponent(params.email);
  await db.gameTester.delete({ where: { email } });
  return NextResponse.json({ ok: true });
}
