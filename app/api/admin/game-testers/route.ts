import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  const testers = await db.gameTester.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ testers });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();

  const email = (body.email || "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email é obrigatório" }, { status: 400 });
  }

  const tester = await db.gameTester.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  return NextResponse.json({ tester }, { status: 201 });
}
