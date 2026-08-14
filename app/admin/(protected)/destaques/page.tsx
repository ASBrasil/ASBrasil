import { db } from "@/lib/db";
import Link from "next/link";
import { FeaturedToggle } from "@/components/admin/FeaturedToggle";

export const dynamic = "force-dynamic";

export default async function FeaturedEventsPage() {
  const events = await db.event.findMany({
    where: { archived: false },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: { id: true, name: true, campaign: true, active: true, featuredOnLogin: true },
  });

  return (
    <div>
      <div className="header">
        <h1>Destaques da tela de login</h1>
        <p className="subtitle">
          Escolha quais eventos aparecem no banner rotativo da página onde o participante digita
          o e-mail (<code>/entrar</code>). Fica a seu critério — nem todo evento ativo precisa
          aparecer lá.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="empty">
          <p>Nenhum evento ativo no momento.</p>
        </div>
      ) : (
        <div className="list">
          {events.map((event) => (
            <div key={event.id} className="row">
              <div className="info">
                {event.campaign && <span className="campaign">{event.campaign}</span>}
                <Link href={`/admin/events/${event.id}`} className="name">
                  {event.name}
                </Link>
                {!event.active && <span className="draft-badge">Rascunho</span>}
              </div>
              <FeaturedToggle eventId={event.id} featured={event.featuredOnLogin} />
            </div>
          ))}
        </div>
      )}

      <style>{`
        .header { margin-bottom: 1.75rem; max-width: 36rem; }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; }
        .subtitle code {
          background: var(--surface);
          padding: 0.1rem 0.4rem;
          border-radius: 0.3rem;
          font-size: 0.85em;
        }
        .empty {
          background: var(--surface);
          border: 1px dashed var(--border);
          border-radius: 1rem;
          padding: 3rem;
          text-align: center;
          color: var(--text-muted);
        }
        .list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          max-width: 36rem;
        }
        .row {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 0.9rem 1.1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .info {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          min-width: 0;
        }
        .campaign {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--indigo-600);
          flex-shrink: 0;
        }
        .name {
          color: var(--text);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.92rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .name:hover {
          text-decoration: underline;
        }
        .draft-badge {
          font-size: 0.7rem;
          color: var(--text-muted);
          background: var(--bg);
          border-radius: 999px;
          padding: 0.15rem 0.55rem;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
