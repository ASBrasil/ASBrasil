import Link from "next/link";
import { db } from "@/lib/db";
import { EventCard } from "@/components/EventCard";

export const dynamic = "force-dynamic";

export default async function EventsListPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const showArchived = searchParams.tab === "archived";

  const events = await db.event.findMany({
    where: { archived: showArchived },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { participants: true, prizes: true } } },
  });

  return (
    <div>
      <div className="header">
        <div>
          <h1>Eventos</h1>
          <p className="subtitle">Campanhas de sorteio criadas até agora.</p>
        </div>
        <Link href="/admin/events/new" className="new-btn">
          + Novo evento
        </Link>
      </div>

      <div className="tabs">
        <Link href="/admin/events" className={`tab ${!showArchived ? "active" : ""}`}>
          Ativos
        </Link>
        <Link href="/admin/events?tab=archived" className={`tab ${showArchived ? "active" : ""}`}>
          Arquivados
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="empty">
          <p>
            {showArchived
              ? "Nenhum evento arquivado."
              : "Nenhum evento ainda. Crie o primeiro para começar a sortear."}
          </p>
        </div>
      ) : (
        <div className="grid">
          {events.map((event, i) => (
            <EventCard
              key={event.id}
              event={{
                id: event.id,
                name: event.name,
                campaign: event.campaign,
                active: event.active,
                archived: event.archived,
                participantsCount: event._count.participants,
                prizesCount: event._count.prizes,
              }}
              isFirst={i === 0}
              isLast={i === events.length - 1}
            />
          ))}
        </div>
      )}

      <style>{`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2.5rem;
        }
        h1 { margin: 0 0 0.25rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; }
        .new-btn {
          background: var(--indigo-600);
          color: white;
          text-decoration: none;
          padding: 0.7rem 1.3rem;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border);
        }
        .tab {
          text-decoration: none;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
          padding: 0.6rem 0.9rem;
          border-bottom: 2px solid transparent;
        }
        .tab.active {
          color: var(--indigo-600);
          border-bottom-color: var(--indigo-600);
        }
        .empty {
          background: var(--surface);
          border: 1px dashed var(--border);
          border-radius: 1rem;
          padding: 3rem;
          text-align: center;
          color: var(--text-muted);
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
          gap: 1rem;
        }
      `}</style>
    </div>
  );
}
