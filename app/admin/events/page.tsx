import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EventsListPage() {
  const events = await db.event.findMany({
    orderBy: { createdAt: "desc" },
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

      {events.length === 0 ? (
        <div className="empty">
          <p>Nenhum evento ainda. Crie o primeiro para começar a sortear.</p>
        </div>
      ) : (
        <div className="grid">
          {events.map((event) => (
            <Link key={event.id} href={`/admin/events/${event.id}`} className="event-card">
              <div className="status">
                <span className={`dot ${event.active ? "active" : ""}`} />
                {event.active ? "Publicado" : "Rascunho"}
              </div>
              <h3>{event.name}</h3>
              {event.campaign && <span className="campaign">{event.campaign}</span>}
              <div className="stats">
                <span>{event._count.participants} participantes</span>
                <span>{event._count.prizes} prêmios</span>
              </div>
            </Link>
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
        .event-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 1.5rem;
          text-decoration: none;
          color: var(--text);
          display: block;
        }
        .event-card:hover {
          border-color: var(--indigo-600);
        }
        .status {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 0.75rem;
        }
        .dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          background: var(--step-inactive);
        }
        .dot.active {
          background: #22c55e;
        }
        h3 { margin: 0 0 0.2rem; }
        .campaign {
          font-size: 0.8rem;
          color: var(--indigo-600);
        }
        .stats {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
