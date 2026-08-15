import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.type !== undefined) data.type = body.type;
  if (body.title !== undefined) data.title = body.title || null;
  if (body.body !== undefined) data.body = body.body || null;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null;
  if (body.linkUrl !== undefined) data.linkUrl = body.linkUrl || null;

  if (body.active !== undefined) {
    data.active = body.active;
    if (body.active) {
      // Só um pop-up ativo por vez - liga este, desliga qualquer outro
      // que já estivesse ligado, numa transação (nunca fica mais de um
      // ativo, mesmo se dois cliques quase simultâneos acontecerem).
      await db.$transaction([
        db.popup.updateMany({ where: { active: true }, data: { active: false } }),
        db.popup.update({ where: { id: params.id }, data }),
      ]);
      const popup = await db.popup.findUnique({ where: { id: params.id } });
      return NextResponse.json({ popup });
    }
  }

  const popup = await db.popup.update({ where: { id: params.id }, data });
  return NextResponse.json({ popup });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  await db.popup.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
