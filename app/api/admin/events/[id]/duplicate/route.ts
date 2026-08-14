import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * Duplicates an event: same theme, settings, and prize list (photos,
 * messages, coupons included), but as a fresh draft. Deliberately does NOT
 * copy participants, import batches, or draw results/status - those belong
 * to that specific run, not to the template. Each duplicated prize starts
 * back at PENDING with no scheduledAt, since a copied date from the
 * original almost certainly doesn't apply to the new event.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();

  const original = await db.event.findUnique({
    where: { id: params.id },
    include: { prizes: { orderBy: { order: "asc" } } },
  });
  if (!original) {
    return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  }

  // Slugs are unique - "<original>-copia", then "-copia-2", "-copia-3"... until free.
  let slug = `${original.slug}-copia`;
  let suffix = 2;
  while (await db.event.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${original.slug}-copia-${suffix}`;
    suffix++;
  }

  // Lands at the end of the active list, same as a brand-new event -
  // otherwise it'd default to order 0 and jump to the top unexpectedly.
  const last = await db.event.findFirst({
    where: { archived: false },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const event = await db.$transaction(async (tx) => {
    const created = await tx.event.create({
      data: {
        name: `${original.name} (cópia)`,
        slug,
        campaign: original.campaign,
        description: original.description,
        theme: original.theme as any,
        publicSignupEnabled: original.publicSignupEnabled,
        signupFields: original.signupFields as any,
        winnerPolicy: original.winnerPolicy,
        active: false, // always starts as a draft, even if the original was published
        archived: false,
        order: (last?.order ?? -1) + 1,
      },
    });

    if (original.prizes.length > 0) {
      await tx.prize.createMany({
        data: original.prizes.map((p) => ({
          eventId: created.id,
          name: p.name,
          description: p.description,
          imageUrl: p.imageUrl,
          quantity: p.quantity,
          order: p.order,
          status: "PENDING" as const,
          scheduledAt: null,
          rules: p.rules,
          winMessage: p.winMessage,
          loseMessage: p.loseMessage,
          couponCode: p.couponCode,
        })),
      });
    }

    return created;
  });

  return NextResponse.json({ event }, { status: 201 });
}
