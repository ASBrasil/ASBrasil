"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface QueueParticipant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  raffleNumber: number;
  photoUrl: string | null;
  customData: Record<string, string> | null;
  moderationStatus: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  missionTitle: string | null;
  // "participant" (padrão, quando omitido) modera um Participant/ticket de
  // verdade. "missionCompletion" é uma conclusão de missão que NÃO gera
  // número extra - não existe ticket próprio pra ela, então precisa de uma
  // rota de moderação diferente (ver /api/admin/mission-completions).
  kind?: "participant" | "missionCompletion";
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendente", color: "#b45309" },
  APPROVED: { label: "Aprovado", color: "#16a34a" },
  REJECTED: { label: "Recusado", color: "#c0392b" },
};

export function ApprovalQueue({
  participants,
  collapsible = false,
  pageSize,
}: {
  participants: QueueParticipant[];
  // Usado nos painéis embutidos na página do evento - lá a lista pode ficar
  // grande (todo mundo aprovado/pendente do evento inteiro), então some por
  // padrão atrás de uma setinha e pagina em vez de jogar tudo na tela de
  // uma vez. A página dedicada de Aprovações (/aprovacoes) não passa isso -
  // continua sempre expandida e inteira, como já era.
  collapsible?: boolean;
  pageSize?: number;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!collapsible);
  const [page, setPage] = useState(1);

  async function moderate(
    id: string,
    status: "APPROVED" | "REJECTED" | "PENDING",
    kind: "participant" | "missionCompletion" = "participant"
  ) {
    setBusyId(id);
    const base = kind === "missionCompletion" ? "/api/admin/mission-completions" : "/api/admin/participants";
    await fetch(`${base}/${id}/moderate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    router.refresh();
  }

  if (participants.length === 0) {
    return <p className="empty">Nenhuma participação nessa categoria.</p>;
  }

  const effectivePageSize = pageSize ?? participants.length;
  const totalPages = Math.max(1, Math.ceil(participants.length / effectivePageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = participants.slice(
    (currentPage - 1) * effectivePageSize,
    currentPage * effectivePageSize
  );

  if (collapsible && !expanded) {
    return (
      <button type="button" className="collapse-toggle" onClick={() => setExpanded(true)}>
        <span className={`arrow ${expanded ? "open" : ""}`}>▸</span>
        Ver lista ({participants.length})
        <style jsx>{`
          .collapse-toggle {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: none;
            border: 1px dashed var(--border);
            border-radius: 0.6rem;
            padding: 0.7rem 1rem;
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-muted);
            cursor: pointer;
            width: 100%;
            text-align: left;
          }
          .collapse-toggle:hover {
            border-color: var(--indigo-600);
            color: var(--text);
          }
          .arrow { display: inline-block; }
        `}</style>
      </button>
    );
  }

  return (
    <div className="queue">
      {collapsible && (
        <button type="button" className="collapse-toggle open" onClick={() => setExpanded(false)}>
          <span className="arrow open">▾</span>
          Ocultar lista ({participants.length})
        </button>
      )}
      {visible.map((p) => (
        <div key={p.id} className="card">
          {p.photoUrl ? (
            <button
              type="button"
              className="photo-btn"
              onClick={() => setLightbox(p.photoUrl)}
              aria-label="Ver comprovante em tamanho grande"
            >
              <img src={p.photoUrl} alt="" className="photo" />
            </button>
          ) : (
            <div className="photo placeholder">Sem foto</div>
          )}

          <div className="info">
            <div className="info-header">
              <strong>{p.name}</strong>
              <span className="status" style={{ color: STATUS_LABEL[p.moderationStatus].color }}>
                {STATUS_LABEL[p.moderationStatus].label}
              </span>
            </div>
            {p.missionTitle && <span className="mission-tag">🎯 Missão: {p.missionTitle}</span>}
            <span className="email">{p.email}</span>
            {p.phone && <span className="detail">📞 {p.phone}</span>}
            {p.customData &&
              Object.entries(p.customData).map(([key, value]) => (
                <span className="detail" key={key}>
                  {key === "instagram" ? "📸" : "•"} {value}
                </span>
              ))}
            <span className="number">Número: {p.raffleNumber}</span>
          </div>

          {p.moderationStatus === "PENDING" && (
            <div className="actions">
              <button
                type="button"
                className="approve-btn"
                onClick={() => moderate(p.id, "APPROVED", p.kind)}
                disabled={busyId === p.id}
              >
                {busyId === p.id ? "…" : "✅ Aprovar"}
              </button>
              <button
                type="button"
                className="reject-btn"
                onClick={() => moderate(p.id, "REJECTED", p.kind)}
                disabled={busyId === p.id}
              >
                {busyId === p.id ? "…" : "❌ Recusar"}
              </button>
            </div>
          )}
          {p.moderationStatus !== "PENDING" && (
            <div className="actions">
              <button
                type="button"
                className="reset-btn"
                onClick={() => moderate(p.id, "PENDING", p.kind)}
                disabled={busyId === p.id}
              >
                Voltar pra pendente
              </button>
            </div>
          )}
        </div>
      ))}

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

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" />
        </div>
      )}

      <style jsx>{`
        .queue {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          max-width: 44rem;
        }
        .card {
          display: flex;
          gap: 1rem;
          align-items: center;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1rem;
        }
        .photo-btn {
          border: none;
          background: none;
          padding: 0;
          cursor: pointer;
          flex-shrink: 0;
        }
        .photo {
          width: 4.5rem;
          height: 4.5rem;
          border-radius: 0.5rem;
          object-fit: cover;
        }
        .photo.placeholder {
          width: 4.5rem;
          height: 4.5rem;
          border-radius: 0.5rem;
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          color: var(--text-muted);
          text-align: center;
        }
        .info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }
        .info-header {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .status {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .email,
        .detail {
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .mission-tag {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--indigo-600, #4f5fff);
          margin: 0.1rem 0 0.15rem;
        }
        .number {
          font-size: 0.8rem;
          font-family: var(--font-mono, monospace);
          margin-top: 0.2rem;
        }
        .actions {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          flex-shrink: 0;
        }
        .approve-btn,
        .reject-btn,
        .reset-btn {
          font-size: 0.8rem;
          font-weight: 600;
          padding: 0.4rem 0.8rem;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--bg);
          cursor: pointer;
          white-space: nowrap;
        }
        .approve-btn {
          color: #16a34a;
          border-color: rgba(22, 163, 74, 0.4);
        }
        .reject-btn {
          color: #c0392b;
          border-color: rgba(192, 57, 43, 0.4);
        }
        .empty {
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .collapse-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: 1px dashed var(--border);
          border-radius: 0.6rem;
          padding: 0.7rem 1rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
          width: 100%;
          text-align: left;
        }
        .collapse-toggle:hover {
          border-color: var(--indigo-600);
          color: var(--text);
        }
        .collapse-toggle.open {
          border-style: solid;
          margin-bottom: 0.1rem;
        }
        .arrow { display: inline-block; }
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding-top: 0.5rem;
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
        .lightbox {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 300;
          padding: 2rem;
          cursor: pointer;
        }
        .lightbox img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 0.5rem;
        }
      `}</style>
    </div>
  );
}
