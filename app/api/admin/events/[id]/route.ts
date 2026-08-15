import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const event = await db.event.findUnique({
    where: { id: params.id },
    include: { prizes: { orderBy: { order: "asc" } }, _count: { select: { participants: true } } },
  });
  if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  return NextResponse.json({ event });
}

/**
 * Partial update - the wizard calls this once per step (theme, then
 * participation method, then publish) instead of one big payload at the
 * end, so nothing is lost if the admin closes the tab mid-flow.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.theme !== undefined) data.theme = body.theme;
  if (body.winnerPolicy !== undefined) data.winnerPolicy = body.winnerPolicy;
  if (body.publicSignupEnabled !== undefined) data.publicSignupEnabled = body.publicSignupEnabled;
  if (body.signupFields !== undefined) data.signupFields = body.signupFields;
  if (body.active !== undefined) data.active = body.active;
  if (body.archived !== undefined) data.archived = body.archived;
  if (body.featuredOnLogin !== undefined) data.featuredOnLogin = body.featuredOnLogin;
  if (body.loginBannerText !== undefined) data.loginBannerText = body.loginBannerText;
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.campaign !== undefined) data.campaign = body.campaign;
  if (body.startAt !== undefined) data.startAt = body.startAt ? new Date(body.startAt) : null;
  if (body.endAt !== undefined) data.endAt = body.endAt ? new Date(body.endAt) : null;

  // Slug changes break already-shared public links, so this gets its own
  // uniqueness check instead of just falling through to a DB constraint error.
  if (body.slug !== undefined) {
    const slugTaken = await db.event.findFirst({
      where: { slug: body.slug, NOT: { id: params.id } },
    });
    if (slugTaken) {
      return NextResponse.json({ error: "Esse slug já está em uso" }, { status: 409 });
    }
    data.slug = body.slug;
  }

  const event = await db.event.update({ where: { id: params.id }, data });
  return NextResponse.json({ event });
}

/**
 * Hard delete. Participant, Prize and ImportBatch cascade automatically from
 * Event (see schema.prisma), but DrawResult intentionally does NOT cascade
 * from Prize - it's the audit trail, and letting it silently disappear
 * defeats the point. So on event deletion we explicitly wipe the
 * DrawResults first (there's no event left to audit against once the event
 * itself is gone), then let the cascade take care of the rest, all inside
 * one transaction so it's never half-deleted.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();

  const event = await db.event.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });

  await db.$transaction([
    db.drawResult.deleteMany({ where: { prize: { eventId: params.id } } }),
    db.event.delete({ where: { id: params.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
