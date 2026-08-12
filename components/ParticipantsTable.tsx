"use client";

import { useEffect, useMemo, useState } from "react";

interface Participant {
  id: string;
  name: string;
  email: string;
  orderNumber: string | null;
  raffleNumber: number;
  source: "IMPORT" | "SIGNUP";
  removedFromDraws: boolean;
}

export function ParticipantsTable({ eventId }: { eventId: string }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    participants: Participant[];
    total: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Debounce so typing doesn't fire a request per keystroke against a
  // 10k+ row table.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ eventId, page: String(page) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    fetch(`/api/admin/participants?${params}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [eventId, debouncedSearch, page]);

  async function handleDelete(id: string) {
    if (!confirm("Remover este participante? Essa ação não pode ser desfeita.")) return;
    await fetch(`/api/admin/participants/${id}`, { method: "DELETE" });
    setData((d) =>
      d ? { ...d, participants: d.participants.filter((p) => p.id !== id), total: d.total - 1 } : d
    );
  }

  const exportUrl = useMemo(
    () => `/api/admin/participants/export?eventId=${eventId}`,
    [eventId]
  );

  return (
    <div className="wrap">
      <div className="toolbar">
        <input
          placeholder="Buscar por nome, e-mail ou pedido…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <a href={exportUrl} className="export">
          Exportar CSV
        </a>
      </div>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Número</th>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Pedido</th>
              <th>Origem</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data?.participants.map((p) => (
              <tr key={p.id}>
                <td className="number">{p.raffleNumber}</td>
                <td>{p.name}</td>
                <td className="muted">{p.email}</td>
                <td className="muted">{p.orderNumber ?? "—"}</td>
                <td className="muted">{p.source === "IMPORT" ? "Importado" : "Inscrição"}</td>
                <td>
                  {p.removedFromDraws ? (
                    <span className="badge removed">Removido</span>
                  ) : (
                    <span className="badge active">Ativo</span>
                  )}
                </td>
                <td>
                  <button className="delete" onClick={() => handleDelete(p.id)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {!loading && data?.participants.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  Nenhum participante encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > 0 && (
        <div className="pagination">
          <span>
            {data.total} participante{data.total !== 1 ? "s" : ""} · página {page} de {data.totalPages}
          </span>
          <div className="pager-buttons">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ← Anterior
            </button>
            <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
              Próxima →
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .toolbar {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        input {
          flex: 1;
          max-width: 24rem;
          padding: 0.6rem 0.9rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
        }
        .export {
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 0.6rem 1rem;
          font-size: 0.85rem;
          text-decoration: none;
          color: var(--text);
          white-space: nowrap;
        }
        .table-shell {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          overflow: hidden;
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
        .number {
          font-family: var(--font-mono, monospace);
          font-weight: 600;
        }
        .muted {
          color: var(--text-muted);
        }
        .badge {
          font-size: 0.75rem;
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
        }
        .badge.active {
          background: color-mix(in srgb, #22c55e 15%, transparent);
          color: #16833f;
        }
        .badge.removed {
          background: color-mix(in srgb, #ef4444 12%, transparent);
          color: #b91c1c;
        }
        .delete {
          background: none;
          border: none;
          color: #b91c1c;
          font-size: 0.8rem;
          cursor: pointer;
        }
        .empty {
          text-align: center;
          color: var(--text-muted);
          padding: 2rem;
        }
        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.9rem;
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .pager-buttons {
          display: flex;
          gap: 0.5rem;
        }
        .pager-buttons button {
          border: 1px solid var(--border);
          background: var(--surface);
          border-radius: 0.5rem;
          padding: 0.4rem 0.8rem;
          cursor: pointer;
          font-size: 0.82rem;
        }
        .pager-buttons button:disabled {
          opacity: 0.4;
          cursor: default;
        }
      `}</style>
    </div>
  );
}
