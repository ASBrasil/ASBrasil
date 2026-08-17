import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { performDraw } from "@/lib/drawEngine";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await requireAdmin();

  const outcome = await performDraw(params.id, { adminId, automatic: false });
  if ("error" in outcome) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  return NextResponse.json({ result: outcome.result });
}
