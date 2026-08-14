import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PrizeDrawPanel } from "@/components/PrizeDrawPanel";
import { EventActionsBar } from "@/components/EventActionsBar";
import { PrizeEditPanel } from "@/components/admin/PrizeEditPanel";

export const dynamic = "force-dynamic";

export default async function EventDashboardPage({ params }: { params: { id: string } }) {
  const event = await db.event.findUnique({
    where: { id: params.id },
    include: {
      prizes: { orderBy: { order: "asc" } },
      _count: { select: { participants: true } },
    },
  });
  if (!event) notFound();

  const drawnCount = event.prizes.filter((p) => p.status === "DRAWN").length;

  return (
    <div>
      <div className="header">
        <div>
          <span className="eyebrow">{event.campaign ?? "Evento"}</span>
          <h1>{event.name}</h1>
        </div>
        <div className="header-actions">
          <a href={`/e/${event.slug}`} target="_blank" className="public-link">
            Ver página pública ↗
          </a>
          <EventActionsBar eventId={event.id} archived={event.archived} />
        </div>
      </div>

      <div className="stats-row">
        <a href={`/admin/events/${event.id}/participants`} className="stat stat-link">
          <strong>{event._count.participants}</strong>
          <span>Participantes →</span>
        </a>
        <div className="stat">
          <strong>{event.prizes.length}</strong>
          <span>Prêmios cadastrados</span>
        </div>
        <div className="stat">
          <strong>{drawnCount}</strong>
          <span>Sorteios realizados</span>
        </div>
        <div className="stat">
          <strong>{event.prizes.length - drawnCount}</strong>
          <span>Sorteios pendentes</span>
        </div>
      </div>

      <h2>Prêmios</h2>
      <div className="prizes">
        {event.prizes.map((prize) => (
          <div key={prize.id} className="prize-row">
            <div className="prize-main">
              {prize.imageUrl ? (
                <img src={prize.imageUrl} alt="" className="prize-thumb" />
              ) : (
                <span className="prize-thumb placeholder">🎁</span>
              )}
              <div>
                <strong>{prize.name}</strong>
                {prize.description && <p>{prize.description}</p>}
                <PrizeEditPanel
                  prize={{
                    id: prize.id,
                    name: prize.name,
                    description: prize.description,
                    imageUrl: prize.imageUrl,
                    winMessage: prize.winMessage,
                    loseMessage: prize.loseMessage,
                    couponCode: prize.couponCode,
                  }}
                />
              </div>
            </div>
            <PrizeDrawPanel prize={{ id: prize.id, name: prize.name, status: prize.status }} />
          </div>
        ))}
      </div>

      <style>{`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-size: 0.7rem;
          color: var(--indigo-600);
        }
        h1 { margin: 0.2rem 0 0; font-family: var(--font-display, inherit); }
        .header-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.75rem;
        }
        .public-link {
          color: var(--indigo-600);
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 2.5rem;
        }
        .stat {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.25rem;
        }
        .stat strong {
          display: block;
          font-size: 1.6rem;
        }
        .stat span {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .stat-link {
          text-decoration: none;
          color: inherit;
          display: block;
        }
        .stat-link:hover {
          border-color: var(--indigo-600);
        }
        h2 { font-family: var(--font-display, inherit); margin-bottom: 1rem; }
        .prizes {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .prize-row {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .prize-main {
          display: flex;
          gap: 1rem;
          flex: 1;
          min-width: 16rem;
        }
        .prize-thumb {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 0.6rem;
          object-fit: cover;
          flex-shrink: 0;
        }
        .prize-thumb.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          font-size: 1.3rem;
        }
        .prize-row p {
          margin: 0.2rem 0 0;
          font-size: 0.85rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
