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
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendente", color: "#b45309" },
  APPROVED: { label: "Aprovado", color: "#16a34a" },
  REJECTED: { label: "Recusado", color: "#c0392b" },
};

export function ApprovalQueue({ participants }: { participants: QueueParticipant[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function moderate(id: string, status: "APPROVED" | "REJECTED" | "PENDING") {
    setBusyId(id);
    await fetch(`/api/admin/participants/${id}/moderate`, {
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

  return (
    <div className="queue">
      {participants.map((p) => (
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
                onClick={() => moderate(p.id, "APPROVED")}
                disabled={busyId === p.id}
              >
                {busyId === p.id ? "…" : "✅ Aprovar"}
              </button>
              <button
                type="button"
                className="reject-btn"
                onClick={() => moderate(p.id, "REJECTED")}
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
                onClick={() => moderate(p.id, "PENDING")}
                disabled={busyId === p.id}
              >
                Voltar pra pendente
              </button>
            </div>
          )}
        </div>
      ))}

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
