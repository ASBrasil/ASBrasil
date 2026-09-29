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

  const [porEvento, groups, totalInscricoes, totalPendentes] = await Promise.all([
    db.event.findMany({
      where: { archived: false },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: { id: true, name: true, _count: { select: { participants: true } } },
    }),
    db.participant.groupBy({
      by: ["email"],
      where: eventId ? { eventId } : undefined,
      _count: { _all: true },
      _max: { name: true, createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
    }),
    db.participant.count(),
    db.participant.count({ where: { moderationStatus: "PENDING" } }),
  ]);
  const events = porEvento;

  // Total de pessoas únicas cruzando TODOS os eventos, sem aplicar o
  // filtro de busca/evento - o painel de estatísticas sempre mostra o
  // panorama geral, independente do que estiver filtrado na tabela abaixo.
  // Se não há filtro de evento, "groups" já É o total global, sem
  // precisar de mais uma consulta.
  const totalClientesUnicos = eventId
    ? (await db.participant.groupBy({ by: ["email"] })).length
    : groups.length;

  const maiorEvento = Math.max(1, ...porEvento.map((e) => e._count.participants));

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
          <span className="as-eyebrow">Universo AS</span>
          <h1 className="as-title">Clientes</h1>
          <p className="as-subtitle">
            Todo mundo que já se cadastrou em algum sorteio, cruzando todos os sorteios ({total}{" "}
            {total === 1 ? "cliente" : "clientes"}
            {eventId || q ? " encontrados" : " no total"}). Clica no nome pra ver o histórico
            completo dessa pessoa com a gente.
          </p>
        </div>
        <Link href="/admin/clientes/novo" className="as-btn as-btn-primary">
          + Adicionar cliente
        </Link>
      </div>

      <div className="as-kpi-grid stats-grid">
        <div className="as-card as-kpi">
          <span className="as-kpi-label">Clientes únicos</span>
          <div className="as-kpi-value">{totalClientesUnicos}</div>
        </div>
        <div className="as-card as-kpi">
          <span className="as-kpi-label">Inscrições no total</span>
          <div className="as-kpi-value">{totalInscricoes}</div>
        </div>
        <div className={`as-card as-kpi ${totalPendentes > 0 ? "warn" : ""}`}>
          <span className="as-kpi-label">Pendentes de aprovação</span>
          <div className="as-kpi-value">{totalPendentes}</div>
        </div>
      </div>

      {porEvento.length > 0 && (
        <div className="by-event">
          <span className="as-eyebrow">Cadastrados por sorteio</span>
          <ul>
            {porEvento.map((e) => (
              <li key={e.id}>
                <Link href={`/admin/clientes?eventId=${e.id}`} className="event-row">
                  <span className="event-name">{e.name}</span>
                  <span className="as-progress">
                    <span style={{ width: `${(e._count.participants / maiorEvento) * 100}%` }} />
                  </span>
                  <span className="event-count">{e._count.participants}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="filter" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou e-mail…"
          className="as-input search"
        />
        <select name="eventId" defaultValue={eventId ?? ""} className="as-select">
          <option value="">Todos os sorteios</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <button type="submit" className="as-btn as-btn-secondary">
          Filtrar
        </button>
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

      <div className="as-table-wrap table-shell">
        <table className="as-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Ingressos{eventId ? " neste sorteio" : ""}</th>
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
          align-items: flex-end;
          gap: 1rem;
          margin-bottom: 1.75rem;
        }
        .header .as-subtitle { max-width: 38rem; }
        .stats-grid {
          grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
          max-width: 42rem;
          margin-bottom: 2rem;
        }
        .as-kpi.warn {
          border-color: rgba(180, 83, 9, 0.4);
          background: rgba(180, 83, 9, 0.06);
        }
        .by-event {
          max-width: 42rem;
          margin-bottom: 2rem;
        }
        .by-event ul {
          list-style: none;
          padding: 0;
          margin: 0.85rem 0 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .event-row {
          display: grid;
          grid-template-columns: 10rem 1fr 2.5rem;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          color: var(--as-text, var(--text));
          padding: 0.4rem 0;
        }
        .event-name {
          font-size: 0.85rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .event-count {
          text-align: right;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--as-muted, var(--text-muted));
        }
        .filter {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
        }
        .filter .search {
          min-width: 16rem;
        }
        .filter .as-select {
          min-width: 14rem;
        }
        .filter .clear {
          color: var(--as-muted, var(--text-muted));
          font-size: 0.82rem;
          text-decoration: none;
        }
        .filter .clear:hover {
          text-decoration: underline;
        }
        .search-hint {
          color: var(--as-muted, var(--text-muted));
          font-size: 0.8rem;
          margin: 0 0 1.25rem;
        }
        .table-shell {
          max-width: 50rem;
          margin-top: 1.25rem;
        }
        .muted { color: var(--as-muted, var(--text-muted)); }
        .actions { text-align: right; }
        .view-link {
          color: var(--as-cyan, var(--indigo-600));
          text-decoration: none;
          font-weight: 700;
          font-size: 0.85rem;
        }
        .view-link:hover { text-decoration: underline; }
        .empty { text-align: center; color: var(--as-muted, var(--text-muted)); padding: 2rem; }
        .pagination {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
          font-size: 0.85rem;
          max-width: 50rem;
        }
        .pagination a {
          color: var(--as-cyan, var(--indigo-600));
          text-decoration: none;
          font-weight: 700;
        }
        .pagination a.disabled {
          color: var(--as-muted, var(--text-muted));
          pointer-events: none;
          opacity: 0.5;
        }
        .pagination span {
          color: var(--as-muted, var(--text-muted));
        }
      `}</style>
    </div>
  );
}
