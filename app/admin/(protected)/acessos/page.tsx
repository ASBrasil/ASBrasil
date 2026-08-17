import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AcessosPage() {
  const now = new Date();
  const h48 = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalEntries, entriesToday, entries7d, active48hGroups, uniqueAllTimeGroups] =
    await Promise.all([
      db.loginEvent.count(),
      db.loginEvent.count({ where: { createdAt: { gte: startOfToday } } }),
      db.loginEvent.count({ where: { createdAt: { gte: d7 } } }),
      db.loginEvent.groupBy({ by: ["email"], where: { createdAt: { gte: h48 } } }),
      db.loginEvent.groupBy({ by: ["email"] }),
    ]);

  const active48h = active48hGroups.length;
  const uniqueAllTime = uniqueAllTimeGroups.length;

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

      <style>{`
        .header { margin-bottom: 1.75rem; max-width: 40rem; }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
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
      `}</style>
    </div>
  );
}
