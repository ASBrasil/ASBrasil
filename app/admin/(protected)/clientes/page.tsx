import { db } from "@/lib/db";
import Link from "next/link";
import { fuzzyMatch } from "@/lib/fuzzySearch";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: { page?: string; eventId?: string; q?: string };
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const eventId = searchParams.eventId || undefined;
  const q = searchParams.q?.trim() || "";

  const [events, groups] = await Promise.all([
    db.event.findMany({
      where: { archived: false },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: { id: true, name: true },
    }),
    db.participant.groupBy({
      by: ["email"],
      where: eventId ? { eventId } : undefined,
      _count: { _all: true },
      _max: { name: true, createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
    }),
  ]);

  const filtered = q
    ? groups.filter((g) => fuzzyMatch(q, g._max.name ?? "") || fuzzyMatch(q, g.email))
    : groups;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageGroups = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function pageHref(p: number) {
    const params = new URLSearchParams();
    params.set("page", String(p));
    if (eventId) params.set("eventId", eventId);
    if (q) params.set("q", q);
    return `/admin/clientes?${params.toString()}`;
  }

  return (
    <div>
      <div className="header">
        <div>
          <h1>Clientes</h1>
          <p className="subtitle">
            Todo mundo que já se cadastrou em algum evento, cruzando todos os sorteios ({total}{" "}
            {total === 1 ? "cliente" : "clientes"}
            {eventId || q ? " encontrados" : " no total"}). Clica no nome pra ver o histórico
            completo dessa pessoa com a gente.
          </p>
        </div>
        <Link href="/admin/clientes/novo" className="new-btn">
          + Adicionar cliente
        </Link>
      </div>

      <form className="filter" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou e-mail…"
          className="search"
        />
        <select name="eventId" defaultValue={eventId ?? ""}>
          <option value="">Todos os eventos</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <button type="submit">Filtrar</button>
        {(eventId || q) && (
          <a href="/admin/clientes" className="clear">
            Limpar filtro
          </a>
        )}
      </form>
      {q && (
        <p className="search-hint">
          Busca aproximada: mostra nomes/e-mails parecidos com "{q}", mesmo com pequenos erros de
          digitação.
        </p>
      )}

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Ingressos{eventId ? " neste evento" : ""}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pageGroups.map((g) => (
              <tr key={g.email}>
                <td>{g._max.name ?? "—"}</td>
                <td className="muted">{g.email}</td>
                <td className="muted">{g._count._all}</td>
                <td className="actions">
                  <Link href={`/admin/clientes/${encodeURIComponent(g.email)}`} className="view-link">
                    Ver detalhes →
                  </Link>
                </td>
              </tr>
            ))}
            {pageGroups.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <a href={pageHref(page - 1)} className={page <= 1 ? "disabled" : ""}>
            ← Anterior
          </a>
          <span>
            Página {page} de {totalPages}
          </span>
          <a href={pageHref(page + 1)} className={page >= totalPages ? "disabled" : ""}>
            Próxima →
          </a>
        </div>
      )}

      <style>{`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .header h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; max-width: 38rem; }
        .new-btn {
          background: var(--indigo-600);
          color: white;
          text-decoration: none;
          padding: 0.6rem 1.1rem;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.85rem;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .filter {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
        }
        .filter .search {
          padding: 0.55rem 0.8rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-size: 0.85rem;
          min-width: 16rem;
        }
        .filter select {
          padding: 0.55rem 0.8rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-size: 0.85rem;
          min-width: 14rem;
        }
        .filter button {
          padding: 0.55rem 1rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--indigo-600);
          color: white;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
        }
        .filter .clear {
          color: var(--text-muted);
          font-size: 0.82rem;
          text-decoration: none;
        }
        .filter .clear:hover {
          text-decoration: underline;
        }
        .search-hint {
          color: var(--text-muted);
          font-size: 0.8rem;
          margin: 0 0 1.25rem;
        }
        .table-shell {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          overflow: hidden;
          max-width: 50rem;
          margin-top: 1.25rem;
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
        .muted { color: var(--text-muted); }
        .actions { text-align: right; }
        .view-link {
          color: var(--indigo-600);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.85rem;
        }
        .view-link:hover { text-decoration: underline; }
        .empty { text-align: center; color: var(--text-muted); padding: 2rem; }
        .pagination {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
          font-size: 0.85rem;
          max-width: 50rem;
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
