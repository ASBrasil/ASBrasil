import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  const popups = await db.popup.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ popups });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();

  const type = body.type;
  if (!["TEXT", "IMAGE", "HTML"].includes(type)) {
    return NextResponse.json({ error: "type deve ser TEXT, IMAGE ou HTML" }, { status: 400 });
  }

  const popup = await db.popup.create({
    data: {
      type,
      title: body.title || null,
      body: body.body || null,
      imageUrl: body.imageUrl || null,
      linkUrl: body.linkUrl || null,
      active: false, // sempre nasce desativado - o admin liga quando quiser
    },
  });

  return NextResponse.json({ popup }, { status: 201 });
}
