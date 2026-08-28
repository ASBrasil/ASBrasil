import { db } from "@/lib/db";
import { startOfTodayBrasilia } from "@/lib/timezone";

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
  const startOfToday = startOfTodayBrasilia();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    totalEntries,
    entriesToday,
    entries7d,
    active48hGroups,
    uniqueAllTimeGroups,
    recentEntries,
    last14dEntries,
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
    db.loginEvent.findMany({ where: { createdAt: { gte: d14 } }, select: { createdAt: true } }),
  ]);

  // Agrupa por dia em Brasília inteiramente em JS (evita qualquer
  // ambiguidade de fuso entre SQL e JS) - preenche dias sem nenhum acesso
  // com 0, senão o grafico fica com buracos em vez de barras zeradas.
  const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const dailyMap = new Map<string, number>();
  for (const entry of last14dEntries) {
    const key = dayKey(entry.createdAt);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  }
  const dailyCounts: { label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dailyCounts.push({
      label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }),
      count: dailyMap.get(dayKey(d)) ?? 0,
    });
  }
  const maxDaily = Math.max(1, ...dailyCounts.map((d) => d.count));

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

      <h2>Acessos por dia (últimos 14 dias)</h2>
      <div className="chart">
        {dailyCounts.map((d, i) => (
          <div key={i} className="bar-col">
            <span className="bar-count">{d.count > 0 ? d.count : ""}</span>
            <div className="bar-wrap">
              <div className="bar" style={{ height: `${(d.count / maxDaily) * 100}%` }} />
            </div>
            <span className="bar-label">{d.label}</span>
          </div>
        ))}
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
                    timeZone: "America/Sao_Paulo",
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
        .chart {
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
          height: 10rem;
          max-width: 56rem;
          padding: 1rem 1.25rem 0;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 1rem;
        }
        .bar-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          min-width: 0;
        }
        .bar-count {
          font-size: 0.7rem;
          color: var(--text-muted);
          height: 1rem;
        }
        .bar-wrap {
          flex: 1;
          width: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .bar {
          width: 70%;
          min-height: 2px;
          background: var(--indigo-600);
          border-radius: 0.25rem 0.25rem 0 0;
        }
        .bar-label {
          font-size: 0.65rem;
          color: var(--text-muted);
          margin-top: 0.4rem;
          padding-bottom: 0.75rem;
          white-space: nowrap;
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
