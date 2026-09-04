"use client";

import { useState } from "react";

interface PendingRow {
  email: string;
  name: string;
  missing: string[];
}

/**
 * Destaque, dentro de Aprovações, de quem já se cadastrou mas ainda não
 * completou pré-requisito(s) obrigatório(s) - sem isso, a única forma de
 * descobrir "quem falta o quê" era abrir a matriz de missões e vasculhar
 * linha por linha. O botão "Notificar" cria um ParticipantNotice pra essa
 * pessoa, que vira pop-up (MissionNoticePopup) da próxima vez que ela abrir
 * o painel do evento no site - não existe e-mail/push, então só funciona
 * quando ela voltar a acessar.
 */
export function PendingPrerequisitesPanel({ eventId, rows }: { eventId: string; rows: PendingRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [notified, setNotified] = useState<Set<string>>(new Set());
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const pageSize = 20;

  if (rows.length === 0) return null;

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function notify(row: PendingRow) {
    setBusyEmail(row.email);
    const message =
      row.missing.length === 1
        ? `Vimos que você ainda não completou "${row.missing[0]}". Finalize essa etapa pra garantir sua participação no sorteio! 🍀`
        : `Vimos que ainda faltam algumas etapas pra você: ${row.missing.join(", ")}. Finalize pra garantir sua participação no sorteio! 🍀`;
    const res = await fetch("/api/admin/participants/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, email: row.email, message }),
    });
    setBusyEmail(null);
    if (res.ok) setNotified((prev) => new Set(prev).add(row.email));
  }

  if (!expanded) {
    return (
      <button type="button" className="collapse-toggle" onClick={() => setExpanded(true)}>
        <span className="arrow">▸</span>⚠️ Pendências de pré-requisito ({rows.length})
        <style jsx>{`
          .collapse-toggle {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(180, 83, 9, 0.08);
            border: 1px dashed rgba(180, 83, 9, 0.4);
            border-radius: 0.6rem;
            padding: 0.7rem 1rem;
            font-size: 0.85rem;
            font-weight: 700;
            color: #b45309;
            cursor: pointer;
            width: 100%;
            text-align: left;
            margin-bottom: 1rem;
          }
          .collapse-toggle:hover {
            border-style: solid;
          }
          .arrow {
            display: inline-block;
          }
        `}</style>
      </button>
    );
  }

  return (
    <div className="panel">
      <button type="button" className="collapse-toggle open" onClick={() => setExpanded(false)}>
        <span className="arrow open">▾</span>⚠️ Pendências de pré-requisito ({rows.length})
      </button>

      <div className="list">
        {visible.map((row) => (
          <div key={row.email} className="row">
            <div className="info">
              <strong>{row.name}</strong>
              <span className="email">{row.email}</span>
              <span className="missing">Falta: {row.missing.join(", ")}</span>
            </div>
            <button
              type="button"
              className="notify-btn"
              onClick={() => notify(row)}
              disabled={busyEmail === row.email || notified.has(row.email)}
            >
              {notified.has(row.email) ? "✅ Notificado" : busyEmail === row.email ? "…" : "🔔 Notificar"}
            </button>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
            ← Anterior
          </button>
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Próxima →
          </button>
        </div>
      )}

      <style jsx>{`
        .panel {
          margin-bottom: 1.5rem;
        }
        .collapse-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(180, 83, 9, 0.08);
          border: 1px dashed rgba(180, 83, 9, 0.4);
          border-radius: 0.6rem;
          padding: 0.7rem 1rem;
          font-size: 0.85rem;
          font-weight: 700;
          color: #b45309;
          cursor: pointer;
          width: 100%;
          text-align: left;
        }
        .collapse-toggle.open {
          border-style: solid;
          margin-bottom: 0.75rem;
        }
        .arrow {
          display: inline-block;
        }
        .list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.65rem;
          padding: 0.75rem 1rem;
        }
        .info {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          min-width: 0;
        }
        .email {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .missing {
          font-size: 0.78rem;
          color: #b45309;
          font-weight: 600;
        }
        .notify-btn {
          flex-shrink: 0;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 0.45rem 0.9rem;
          border-radius: 999px;
          border: 1px solid rgba(79, 95, 255, 0.4);
          background: var(--bg);
          color: var(--indigo-600);
          cursor: pointer;
          white-space: nowrap;
        }
        .notify-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding-top: 0.75rem;
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .pagination button {
          background: none;
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 0.35rem 0.85rem;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          color: inherit;
        }
        .pagination button:disabled {
          opacity: 0.4;
          cursor: default;
        }
        .pagination button:not(:disabled):hover {
          border-color: var(--indigo-600);
        }
      `}</style>
    </div>
  );
}
