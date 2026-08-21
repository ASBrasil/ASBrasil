import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { EditEventWizard } from "@/components/wizard/EditEventWizard";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const event = await db.event.findUnique({
    where: { id: params.id },
    include: {
      prizes: { orderBy: { order: "asc" } },
      _count: { select: { participants: true } },
    },
  });
  if (!event) notFound();

  return (
    <EditEventWizard
      event={{
        id: event.id,
        name: event.name,
        campaign: event.campaign ?? "",
        slug: event.slug,
        description: event.description ?? "",
        active: event.active,
        archived: event.archived,
        global: event.global,
        vip: event.vip,
        prerequisiteText: event.prerequisiteText ?? "",
        heroFeatured: event.heroFeatured,
        missionMode: event.missionMode,
        publicSignupEnabled: event.publicSignupEnabled,
        signupFields: event.signupFields as any,
        requireSignupApproval: event.requireSignupApproval,
        theme: event.theme as unknown as { colors?: any; customCss?: string; bannerUrl?: string | null } | null,
        participantsCount: event._count.participants,
        prizes: event.prizes.map((p) => ({ id: p.id, name: p.name, imageUrl: p.imageUrl })),
      }}
    />
  );
}
