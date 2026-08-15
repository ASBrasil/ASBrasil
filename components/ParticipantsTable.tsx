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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  // A busca ou a troca de página muda quem está visível, então a seleção
  // (que é só desta página) não faz mais sentido carregar adiante.
  useEffect(() => {
    setSelected(new Set());
  }, [debouncedSearch, page]);

  async function handleDelete(id: string) {
    if (!confirm("Remover este participante? Essa ação não pode ser desfeita.")) return;
    await fetch(`/api/admin/participants/${id}`, { method: "DELETE" });
    setData((d) =>
      d ? { ...d, participants: d.participants.filter((p) => p.id !== id), total: d.total - 1 } : d
    );
    setSelected((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!data) return;
    setSelected((s) =>
      s.size === data.participants.length ? new Set() : new Set(data.participants.map((p) => p.id))
    );
  }

  async function handleBulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (
      !confirm(
        `Excluir ${ids.length} participante${ids.length !== 1 ? "s" : ""} selecionado${
          ids.length !== 1 ? "s" : ""
        }? Essa ação não pode ser desfeita.`
      )
    )
      return;

    setBulkDeleting(true);
    const res = await fetch("/api/admin/participants/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const result = await res.json();
    setBulkDeleting(false);

    if (!res.ok) {
      alert(result.error ?? "Não foi possível excluir os participantes selecionados.");
      return;
    }

    setData((d) =>
      d
        ? {
            ...d,
            participants: d.participants.filter((p) => !selected.has(p.id)),
            total: d.total - result.deletedCount,
          }
        : d
    );
    setSelected(new Set());

    if (result.blockedCount > 0) {
      alert(
        `${result.deletedCount} excluído${result.deletedCount !== 1 ? "s" : ""}. ${
          result.blockedCount
        } não ${result.blockedCount !== 1 ? "foram excluídos" : "foi excluído"} porque já ${
          result.blockedCount !== 1 ? "ganharam" : "ganhou"
        } algum prêmio (o resultado do sorteio precisa manter o registro).`
      );
    }
  }

  const exportUrl = useMemo(
    () => `/api/admin/participants/export?eventId=${eventId}`,
    [eventId]
  );

  const allSelected = !!data && data.participants.length > 0 && selected.size === data.participants.length;

  return (
    <div className="wrap">
      <div className="toolbar">
        <input
          className="search"
          placeholder="Buscar por nome, e-mail ou pedido…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <a href={exportUrl} className="export">
          Exportar CSV
        </a>
      </div>

      {selected.size > 0 && (
        <div className="bulk-bar">
          <span>
            {selected.size} selecionado{selected.size !== 1 ? "s" : ""}
          </span>
          <button className="bulk-delete" onClick={handleBulkDelete} disabled={bulkDeleting}>
            {bulkDeleting ? "Excluindo…" : "Excluir selecionados"}
          </button>
        </div>
      )}

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th className="checkbox-col">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Selecionar todos"
                />
              </th>
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
              <tr key={p.id} className={selected.has(p.id) ? "row-selected" : ""}>
                <td className="checkbox-col">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleOne(p.id)}
                    aria-label={`Selecionar ${p.name}`}
                  />
                </td>
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
                <td colSpan={8} className="empty">
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
        .search {
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
        .bulk-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          background: color-mix(in srgb, var(--indigo-600) 10%, transparent);
          border: 1px solid var(--indigo-600);
          border-radius: 0.6rem;
          padding: 0.65rem 1rem;
          margin-bottom: 0.75rem;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .bulk-delete {
          background: #b91c1c;
          color: white;
          border: none;
          border-radius: 0.5rem;
          padding: 0.45rem 0.9rem;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
        }
        .bulk-delete:disabled {
          opacity: 0.6;
          cursor: default;
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
        .checkbox-col {
          width: 2.5rem;
          padding-right: 0;
        }
        .checkbox-col input {
          cursor: pointer;
        }
        tr.row-selected {
          background: color-mix(in srgb, var(--indigo-600) 6%, transparent);
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
