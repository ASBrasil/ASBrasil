import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClienteDetailPage({ params }: { params: { email: string } }) {
  const email = params.email; // Next já decodifica o segmento dinâmico da URL

  const rows = await db.participant.findMany({
    where: { email },
    include: {
      event: { select: { id: true, name: true, campaign: true, archived: true } },
      drawResults: { where: { voided: false }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (rows.length === 0) notFound();

  const displayName = rows[0].name;

  const byEvent = new Map<
    string,
    {
      event: (typeof rows)[number]["event"];
      numbers: number[];
      wins: number;
      firstSeen: Date;
    }
  >();
  for (const row of rows) {
    const entry = byEvent.get(row.event.id);
    if (entry) {
      entry.numbers.push(row.raffleNumber);
      entry.wins += row.drawResults.length;
      if (row.createdAt < entry.firstSeen) entry.firstSeen = row.createdAt;
    } else {
      byEvent.set(row.event.id, {
        event: row.event,
        numbers: [row.raffleNumber],
        wins: row.drawResults.length,
        firstSeen: row.createdAt,
      });
    }
  }
  const participations = [...byEvent.values()].sort(
    (a, b) => b.firstSeen.getTime() - a.firstSeen.getTime()
  );

  const totalTickets = rows.length;
  const totalWins = participations.reduce((sum, p) => sum + p.wins, 0);

  return (
    <div>
      <Link href="/admin/clientes" className="back">
        ← Clientes
      </Link>

      <div className="header">
        <h1>{displayName}</h1>
        <p className="email">{email}</p>
      </div>

      <div className="stats">
        <div className="stat-card">
          <strong>{participations.length}</strong>
          <span>{participations.length === 1 ? "Evento" : "Eventos"}</span>
        </div>
        <div className="stat-card">
          <strong>{totalTickets}</strong>
          <span>Ingressos no total</span>
        </div>
        <div className="stat-card">
          <strong>{totalWins}</strong>
          <span>{totalWins === 1 ? "Prêmio ganho" : "Prêmios ganhos"}</span>
        </div>
      </div>

      <h2>Histórico por evento</h2>
      <div className="list">
        {participations.map(({ event, numbers, wins }) => (
          <div key={event.id} className="row">
            <div className="info">
              {event.campaign && <span className="campaign">{event.campaign}</span>}
              <Link href={`/admin/events/${event.id}`} className="name">
                {event.name}
              </Link>
              {event.archived && <span className="badge">Arquivado</span>}
            </div>
            <div className="numbers">
              {numbers.length} {numbers.length === 1 ? "número" : "números"}: {numbers.join(", ")}
              {wins > 0 && <span className="won"> · 🏆 ganhou {wins}x</span>}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .back {
          color: var(--indigo-600);
          text-decoration: none;
          font-size: 0.85rem;
        }
        .header { margin: 1rem 0 1.5rem; }
        h1 { margin: 0 0 0.2rem; font-family: var(--font-display, inherit); }
        .email { color: var(--text-muted); font-size: 0.9rem; margin: 0; }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
          gap: 1rem;
          max-width: 32rem;
          margin-bottom: 2.25rem;
        }
        .stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 1.1rem 1.25rem;
        }
        .stat-card strong {
          display: block;
          font-size: 1.6rem;
          font-family: var(--font-display, inherit);
        }
        .stat-card span {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        h2 {
          font-family: var(--font-display, inherit);
          font-size: 1.05rem;
          margin: 0 0 1rem;
        }
        .list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          max-width: 44rem;
        }
        .row {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1rem 1.25rem;
        }
        .info {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 0.3rem;
        }
        .campaign {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--indigo-600);
        }
        .name {
          color: var(--text);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .name:hover { text-decoration: underline; }
        .badge {
          font-size: 0.7rem;
          color: var(--text-muted);
          background: var(--bg);
          border-radius: 999px;
          padding: 0.15rem 0.55rem;
        }
        .numbers {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-family: var(--font-mono, monospace);
        }
        .won {
          color: #b8860b;
          font-family: inherit;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
