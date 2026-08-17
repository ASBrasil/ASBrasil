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
  heroFeatured: boolean;
  bannerUrl: string | null;
  primary: string;
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

      <Link
        href={`/admin/events/${event.id}`}
        className="card-link"
        style={{ textDecoration: "none", color: "var(--text)", display: "block" }}
      >
        {/* O mesmo banner que o participante vê em "Meus eventos" - assim
            o admin confere de relance como está, sem precisar abrir a
            página pública. */}
        {event.bannerUrl ? (
          <img src={event.bannerUrl} alt="" className="banner-img" />
        ) : (
          <div className="banner-fallback" style={{ background: event.primary }} />
        )}

        <div className="body">
          <div className="status">
            <span className={`dot ${event.active ? "active" : ""}`} />
            {event.archived ? "Arquivado" : event.active ? "Publicado" : "Rascunho"}
            {event.heroFeatured && <span className="hero-badge">🎞️ No banner</span>}
          </div>
          <h3>{event.name}</h3>
          {event.campaign && <span className="campaign">{event.campaign}</span>}
          <div className="stats">
            <span>{event.participantsCount} participantes</span>
            <span>{event.prizesCount} prêmios</span>
          </div>
        </div>
      </Link>

      <div className="actions">
        <Link
          href={`/admin/events/${event.id}/edit`}
          className="action-link"
          style={{
            fontSize: "0.78rem",
            fontWeight: 600,
            padding: "0.35rem 0.7rem",
            borderRadius: "999px",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-muted)",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
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
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .event-card:hover {
          border-color: var(--indigo-600);
        }
        .reorder {
          position: absolute;
          top: 0.6rem;
          right: 0.6rem;
          display: flex;
          gap: 0.25rem;
          z-index: 2;
        }
        .reorder button {
          width: 1.5rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 0.35rem;
          color: white;
          font-size: 0.6rem;
          cursor: pointer;
          padding: 0;
        }
        .reorder button:hover:not(:disabled) {
          border-color: white;
        }
        .reorder button:disabled {
          opacity: 0.35;
          cursor: default;
        }
        .banner-img,
        .banner-fallback {
          width: 100%;
          height: 8rem;
          object-fit: cover;
          display: block;
        }
        .body {
          padding: 1.1rem 1.25rem;
        }
        .status {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.4rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 0.6rem;
        }
        .dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          background: var(--step-inactive);
          flex-shrink: 0;
        }
        .dot.active {
          background: #22c55e;
        }
        .hero-badge {
          background: color-mix(in srgb, var(--indigo-600) 15%, transparent);
          color: var(--indigo-600);
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.1rem 0.5rem;
          border-radius: 999px;
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
          margin-top: 0.85rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          border-top: 1px solid var(--border);
          padding: 0.85rem 1.25rem;
        }
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
          white-space: nowrap;
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
          flex-wrap: wrap;
        }
        .card-error {
          font-size: 0.78rem;
          color: #c0392b;
          margin: 0 1.25rem 0.85rem;
        }
      `}</style>
    </div>
  );
}
