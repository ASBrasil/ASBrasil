import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const losePopup = await db.prizeLosePopup.findUnique({ where: { prizeId: params.id } });
  return NextResponse.json({ losePopup });
}

/**
 * Upsert - the admin form always sends the full desired state, whether a
 * PrizeLosePopup row already exists for this prize or not (most prizes
 * won't have one until the admin turns it on for the first time).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json();

  const type = body.type;
  if (!["TEXT", "IMAGE", "HTML"].includes(type)) {
    return NextResponse.json({ error: "type deve ser TEXT, IMAGE ou HTML" }, { status: 400 });
  }

  const data = {
    active: !!body.active,
    type,
    title: body.title || null,
    body: body.body || null,
    imageUrl: body.imageUrl || null,
    linkUrl: body.linkUrl || null,
  };

  const losePopup = await db.prizeLosePopup.upsert({
    where: { prizeId: params.id },
    create: { prizeId: params.id, ...data },
    update: data,
  });

  return NextResponse.json({ losePopup });
}
