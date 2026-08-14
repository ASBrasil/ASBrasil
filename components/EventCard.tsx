"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface EventCardData {
  id: string;
  name: string;
  campaign: string | null;
  active: boolean;
  archived: boolean;
  participantsCount: number;
  prizesCount: number;
}

export function EventCard({
  event,
  isFirst,
  isLast,
}: {
  event: EventCardData;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function move(direction: "up" | "down") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/events/${event.id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Não foi possível reordenar.");
      return;
    }
    router.refresh();
  }

  async function toggleArchive() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !event.archived }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Não foi possível atualizar.");
      return;
    }
    router.refresh();
  }

  async function duplicate() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/events/${event.id}/duplicate`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Não foi possível duplicar.");
      return;
    }
    router.push(`/admin/events/${data.event.id}`);
  }

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/events/${event.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível excluir.");
      setBusy(false);
      setConfirmingDelete(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="event-card">
      <div className="reorder">
        <button
          type="button"
          aria-label="Mover para cima"
          onClick={() => move("up")}
          disabled={busy || isFirst}
        >
          ▲
        </button>
        <button
          type="button"
          aria-label="Mover para baixo"
          onClick={() => move("down")}
          disabled={busy || isLast}
        >
          ▼
        </button>
      </div>

      <Link href={`/admin/events/${event.id}`} className="card-link">
        <div className="status">
          <span className={`dot ${event.active ? "active" : ""}`} />
          {event.archived ? "Arquivado" : event.active ? "Publicado" : "Rascunho"}
        </div>
        <h3>{event.name}</h3>
        {event.campaign && <span className="campaign">{event.campaign}</span>}
        <div className="stats">
          <span>{event.participantsCount} participantes</span>
          <span>{event.prizesCount} prêmios</span>
        </div>
      </Link>

      <div className="actions">
        <Link href={`/admin/events/${event.id}/edit`} className="action-link">
          Editar
        </Link>
        <button type="button" className="action-btn" onClick={toggleArchive} disabled={busy}>
          {event.archived ? "Desarquivar" : "Arquivar"}
        </button>
        <button type="button" className="action-btn" onClick={duplicate} disabled={busy}>
          {busy ? "…" : "Duplicar"}
        </button>
        {!confirmingDelete ? (
          <button
            type="button"
            className="action-btn danger"
            onClick={() => setConfirmingDelete(true)}
            disabled={busy}
          >
            Excluir
          </button>
        ) : (
          <span className="confirm">
            Excluir tudo?
            <button type="button" className="action-btn danger" onClick={confirmDelete} disabled={busy}>
              {busy ? "Excluindo…" : "Sim"}
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => setConfirmingDelete(false)}
              disabled={busy}
            >
              Não
            </button>
          </span>
        )}
      </div>
      {error && <p className="card-error">{error}</p>}

      <style jsx>{`
        .event-card {
          position: relative;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .event-card:hover {
          border-color: var(--indigo-600);
        }
        .reorder {
          position: absolute;
          top: 0.85rem;
          right: 0.85rem;
          display: flex;
          gap: 0.25rem;
          z-index: 1;
        }
        .reorder button {
          width: 1.5rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 0.35rem;
          color: var(--text-muted);
          font-size: 0.6rem;
          cursor: pointer;
          padding: 0;
        }
        .reorder button:hover:not(:disabled) {
          border-color: var(--indigo-600);
          color: var(--text);
        }
        .reorder button:disabled {
          opacity: 0.3;
          cursor: default;
        }
        .card-link {
          text-decoration: none;
          color: var(--text);
          display: block;
          padding-right: 3.5rem;
        }
        .status {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 0.75rem;
        }
        .dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          background: var(--step-inactive);
        }
        .dot.active {
          background: #22c55e;
        }
        h3 {
          margin: 0 0 0.2rem;
        }
        .campaign {
          font-size: 0.8rem;
          color: var(--indigo-600);
        }
        .stats {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          border-top: 1px solid var(--border);
          padding-top: 0.85rem;
        }
        .action-link,
        .action-btn {
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.35rem 0.7rem;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          text-decoration: none;
        }
        .action-link:hover,
        .action-btn:hover:not(:disabled) {
          border-color: var(--indigo-600);
          color: var(--text);
        }
        .action-btn.danger {
          color: #c0392b;
        }
        .action-btn.danger:hover:not(:disabled) {
          border-color: #c0392b;
        }
        .action-btn:disabled {
          opacity: 0.55;
          cursor: default;
        }
        .confirm {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .card-error {
          font-size: 0.78rem;
          color: #c0392b;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
