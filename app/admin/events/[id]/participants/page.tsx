import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ParticipantsPageClient } from "@/components/participant/ParticipantsPageClient";

export const dynamic = "force-dynamic";

export default async function EventParticipantsPage({ params }: { params: { id: string } }) {
  const event = await db.event.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!event) notFound();

  return (
    <div>
      <div className="header">
        <div>
          <Link href={`/admin/events/${event.id}`} className="back">
            ← {event.name}
          </Link>
          <h1>Participantes</h1>
        </div>
      </div>

      <ParticipantsPageClient eventId={event.id} />

      <style>{`
        .header { margin-bottom: 1.5rem; }
        .back {
          color: var(--indigo-600);
          text-decoration: none;
          font-size: 0.85rem;
        }
        h1 { margin: 0.3rem 0 0; font-family: var(--font-display, inherit); }
      `}</style>
    </div>
  );
}
