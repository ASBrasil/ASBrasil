"use client";

import { useEffect, useState } from "react";

interface BatchSummary {
  id: string;
  filename: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
  finishedAt: string | null;
}

interface BatchDetail extends BatchSummary {
  errors: { row: number; reason: string }[];
}

const STATUS_LABEL: Record<BatchSummary["status"], string> = {
  PROCESSING: "Processando…",
  COMPLETED: "Concluído",
  FAILED: "Falhou no meio do processo",
};

export function ImportHistoryClient({ eventId }: { eventId: string }) {
  const [batches, setBatches] = useState<BatchSummary[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<BatchDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/events/${eventId}/import-batches`)
      .then((res) => res.json())
      .then((data) => setBatches(data.batches ?? []));
  }, [eventId]);

  async function toggle(batchId: string) {
    if (expanded === batchId) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(batchId);
    setDetail(null);
    setLoadingDetail(true);
    const res = await fetch(`/api/admin/import-batches/${batchId}`);
    const data = await res.json();
    setLoadingDetail(false);
    setDetail(data.batch ?? null);
  }

  if (batches === null) {
    return <p className="muted">Carregando…</p>;
  }

  if (batches.length === 0) {
    return <p className="muted">Nenhuma importação registrada para este evento ainda.</p>;
  }

  return (
    <div className="list">
      {batches.map((batch) => (
        <div key={batch.id} className="batch">
          <button type="button" className="batch-header" onClick={() => toggle(batch.id)}>
            <div className="batch-main">
              <strong>{batch.filename}</strong>
              <span className="date">
                {new Date(batch.createdAt).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/Sao_Paulo",
                })}
              </span>
            </div>
            <div className="batch-counts">
              <span className="count valid">{batch.validRows} válidos</span>
              {batch.errorRows > 0 && <span className="count error">{batch.errorRows} rejeitados</span>}
              <span className={`status status-${batch.status.toLowerCase()}`}>
                {STATUS_LABEL[batch.status]}
              </span>
              <span className="chevron">{expanded === batch.id ? "▲" : "▼"}</span>
            </div>
          </button>

          {expanded === batch.id && (
            <div className="errors-panel">
              {loadingDetail && <p className="muted">Carregando detalhes…</p>}
              {!loadingDetail && detail && detail.errors.length === 0 && (
                <p className="muted">Nenhuma linha rejeitada nessa importação. 🎉</p>
              )}
              {!loadingDetail && detail && detail.errors.length > 0 && (
                <>
                  <p className="errors-hint">
                    Mostrando {detail.errors.length} de {detail.errorRows} linha(s) rejeitada(s)
                    {detail.errorRows > detail.errors.length
                      ? " (as primeiras 200; exporte a planilha original para ver o restante)"
                      : ""}
                    :
                  </p>
                  <ul className="errors-list">
                    {detail.errors.map((e, i) => (
                      <li key={i}>
                        <span className="row-num">Linha {e.row}</span> — {e.reason}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      ))}

      <style jsx>{`
        .muted {
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .batch {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          overflow: hidden;
        }
        .batch-header {
          width: 100%;
          background: none;
          border: none;
          padding: 1rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          cursor: pointer;
          text-align: left;
          font: inherit;
          color: inherit;
        }
        .batch-main {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .date {
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .batch-counts {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.8rem;
        }
        .count {
          padding: 0.25rem 0.65rem;
          border-radius: 999px;
          font-weight: 600;
        }
        .count.valid {
          background: rgba(34, 197, 94, 0.15);
          color: #16a34a;
        }
        .count.error {
          background: rgba(192, 57, 43, 0.12);
          color: #c0392b;
        }
        .status {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .status-failed {
          color: #c0392b;
        }
        .chevron {
          color: var(--text-muted);
          font-size: 0.7rem;
        }
        .errors-panel {
          border-top: 1px solid var(--border);
          padding: 1rem 1.25rem 1.25rem;
        }
        .errors-hint {
          font-size: 0.82rem;
          color: var(--text-muted);
          margin: 0 0 0.75rem;
        }
        .errors-list {
          list-style: none;
          margin: 0;
          padding: 0;
          max-height: 22rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          font-size: 0.85rem;
        }
        .errors-list li {
          background: var(--bg);
          border-radius: 0.4rem;
          padding: 0.5rem 0.7rem;
        }
        .row-num {
          font-family: var(--font-mono, monospace);
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
