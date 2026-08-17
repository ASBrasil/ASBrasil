import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AcessosPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);

  const now = new Date();
  const h48 = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalEntries,
    entriesToday,
    entries7d,
    active48hGroups,
    uniqueAllTimeGroups,
    recentEntries,
  ] = await Promise.all([
    db.loginEvent.count(),
    db.loginEvent.count({ where: { createdAt: { gte: startOfToday } } }),
    db.loginEvent.count({ where: { createdAt: { gte: d7 } } }),
    db.loginEvent.groupBy({ by: ["email"], where: { createdAt: { gte: h48 } } }),
    db.loginEvent.groupBy({ by: ["email"] }),
    db.loginEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const active48h = active48hGroups.length;
  const uniqueAllTime = uniqueAllTimeGroups.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));

  return (
    <div>
      <div className="header">
        <h1>Acessos</h1>
        <p className="subtitle">
          Toda vez que alguém entra com um e-mail conhecido em <code>/entrar</code>, fica
          registrado aqui. Base para futuras mecânicas de dias seguidos entrando.
        </p>
      </div>

      <div className="stats">
        <div className="stat-card">
          <strong>{totalEntries}</strong>
          <span>Entradas no total</span>
        </div>
        <div className="stat-card highlight">
          <strong>{active48h}</strong>
          <span>Clientes ativos (últimas 48h)</span>
        </div>
        <div className="stat-card">
          <strong>{entriesToday}</strong>
          <span>Entradas hoje</span>
        </div>
        <div className="stat-card">
          <strong>{entries7d}</strong>
          <span>Entradas nos últimos 7 dias</span>
        </div>
        <div className="stat-card">
          <strong>{uniqueAllTime}</strong>
          <span>E-mails únicos que já entraram</span>
        </div>
      </div>

      <h2>Histórico</h2>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>E-mail</th>
              <th>Data e hora</th>
            </tr>
          </thead>
          <tbody>
            {recentEntries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.email}</td>
                <td className="muted">
                  {entry.createdAt.toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </td>
              </tr>
            ))}
            {recentEntries.length === 0 && (
              <tr>
                <td colSpan={2} className="empty">
                  Nenhum acesso registrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <a
            href={`/admin/acessos?page=${page - 1}`}
            aria-disabled={page <= 1}
            className={page <= 1 ? "disabled" : ""}
          >
            ← Anterior
          </a>
          <span>
            Página {page} de {totalPages}
          </span>
          <a
            href={`/admin/acessos?page=${page + 1}`}
            aria-disabled={page >= totalPages}
            className={page >= totalPages ? "disabled" : ""}
          >
            Próxima →
          </a>
        </div>
      )}

      <style>{`
        .header { margin-bottom: 1.75rem; max-width: 40rem; }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        h2 {
          font-family: var(--font-display, inherit);
          font-size: 1.1rem;
          margin: 2.5rem 0 1rem;
        }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; }
        .subtitle code {
          background: var(--surface);
          padding: 0.1rem 0.4rem;
          border-radius: 0.3rem;
          font-size: 0.85em;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
          gap: 1rem;
          max-width: 56rem;
        }
        .stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 1.25rem 1.5rem;
        }
        .stat-card.highlight {
          border-color: var(--indigo-600);
          background: color-mix(in srgb, var(--indigo-600) 8%, var(--surface));
        }
        .stat-card strong {
          display: block;
          font-size: 1.9rem;
          font-family: var(--font-display, inherit);
        }
        .stat-card span {
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .table-shell {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          overflow: hidden;
          max-width: 40rem;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;
        }
        th {
          text-align: left;
          padding: 0.7rem 1rem;
          background: var(--bg);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
        }
        td {
          padding: 0.65rem 1rem;
          border-top: 1px solid var(--border);
        }
        .muted { color: var(--text-muted); font-family: var(--font-mono, monospace); font-size: 0.85rem; }
        .empty { text-align: center; color: var(--text-muted); padding: 2rem; }
        .pagination {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
          font-size: 0.85rem;
          max-width: 40rem;
        }
        .pagination a {
          color: var(--indigo-600);
          text-decoration: none;
          font-weight: 600;
        }
        .pagination a.disabled {
          color: var(--text-muted);
          pointer-events: none;
          opacity: 0.5;
        }
        .pagination span {
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
