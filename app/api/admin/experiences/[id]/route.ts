import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const experience = await db.experience.findUnique({
    where: { id: params.id },
    include: {
      events: {
        orderBy: { order: "asc" },
        select: { id: true, name: true, slug: true, campaign: true, active: true, archived: true },
      },
    },
  });
  if (!experience) return NextResponse.json({ error: "Experience não encontrada" }, { status: 404 });
  return NextResponse.json({ experience });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.subtitle !== undefined) data.subtitle = body.subtitle || null;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.theme !== undefined) data.theme = body.theme;
  if (body.active !== undefined) data.active = body.active;

  if (body.slug !== undefined) {
    const slugTaken = await db.experience.findFirst({ where: { slug: body.slug, NOT: { id: params.id } } });
    if (slugTaken) {
      return NextResponse.json({ error: "Esse slug já está em uso" }, { status: 409 });
    }
    data.slug = body.slug;
  }

  const experience = await db.experience.update({ where: { id: params.id }, data });
  return NextResponse.json({ experience });
}

/**
 * Sorteios vinculados NÃO são apagados junto (Event.experienceId tem
 * onDelete: SetNull) - eles só voltam a ficar "avulsos", exatamente como
 * antes de existir essa Experience.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  await db.experience.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
