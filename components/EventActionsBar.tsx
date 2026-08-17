"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function EventActionsBar({ eventId, archived }: { eventId: string; archived: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleArchive() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !archived }),
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
    const res = await fetch(`/api/admin/events/${eventId}/duplicate`, { method: "POST" });
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
    const res = await fetch(`/api/admin/events/${eventId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível excluir.");
      setBusy(false);
      setConfirmingDelete(false);
      return;
    }
    router.push("/admin/events");
    router.refresh();
  }

  return (
    <div className="actions-bar">
      <Link
        href={`/admin/events/${eventId}/edit`}
        className="edit-link"
        style={{
          fontSize: "0.85rem",
          fontWeight: 600,
          color: "var(--indigo-600)",
          textDecoration: "none",
          padding: "0.55rem 1rem",
          borderRadius: "999px",
          border: "1px solid var(--border)",
        }}
      >
        ✏️ Editar
      </Link>
      <button type="button" className="ghost-btn" onClick={toggleArchive} disabled={busy}>
        {archived ? "Desarquivar" : "Arquivar"}
      </button>
      <button type="button" className="ghost-btn" onClick={duplicate} disabled={busy}>
        {busy ? "…" : "📋 Duplicar"}
      </button>
      {!confirmingDelete ? (
        <button type="button" className="danger-btn" onClick={() => setConfirmingDelete(true)} disabled={busy}>
          Excluir evento
        </button>
      ) : (
        <span className="confirm">
          Excluir definitivamente, com participantes e resultados de sorteio?
          <button type="button" className="danger-btn" onClick={confirmDelete} disabled={busy}>
            {busy ? "Excluindo…" : "Sim, excluir"}
          </button>
          <button type="button" className="cancel-btn" onClick={() => setConfirmingDelete(false)} disabled={busy}>
            Cancelar
          </button>
        </span>
      )}
      {error && <p className="error">{error}</p>}

      <style jsx>{`
        .actions-bar {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        .ghost-btn {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
          background: transparent;
          border: 1px solid var(--border);
          padding: 0.55rem 1rem;
          border-radius: 999px;
          cursor: pointer;
        }
        .ghost-btn:hover:not(:disabled) {
          border-color: var(--indigo-600);
          color: var(--text);
        }
        .danger-btn {
          font-size: 0.85rem;
          font-weight: 600;
          color: #c0392b;
          background: transparent;
          border: 1px solid transparent;
          padding: 0.55rem 1rem;
          border-radius: 999px;
          cursor: pointer;
        }
        .danger-btn:hover:not(:disabled) {
          border-color: #c0392b;
        }
        button:disabled {
          opacity: 0.55;
          cursor: default;
        }
        .cancel-btn {
          font-size: 0.85rem;
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
        }
        .confirm {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.82rem;
          color: var(--text-muted);
          flex-wrap: wrap;
        }
        .error {
          width: 100%;
          font-size: 0.8rem;
          color: #c0392b;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
