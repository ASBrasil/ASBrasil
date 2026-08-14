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
        <Link href={`/admin/events/${event.id}/imports`} className="history-link">
          🕓 Histórico de importações
        </Link>
      </div>

      <ParticipantsPageClient eventId={event.id} />

      <style>{`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
        }
        .back {
          color: var(--indigo-600);
          text-decoration: none;
          font-size: 0.85rem;
        }
        h1 { margin: 0.3rem 0 0; font-family: var(--font-display, inherit); }
        .history-link {
          color: var(--text-muted);
          text-decoration: none;
          font-size: 0.82rem;
          font-weight: 600;
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 0.5rem 0.9rem;
          white-space: nowrap;
        }
        .history-link:hover {
          border-color: var(--indigo-600);
          color: var(--text);
        }
      `}</style>
    </div>
  );
}
