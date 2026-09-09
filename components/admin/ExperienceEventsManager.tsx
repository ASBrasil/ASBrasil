"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/primitives";

interface EventRow {
  id: string;
  name: string;
  slug: string;
  campaign: string | null;
  active: boolean;
}

export function ExperienceEventsManager({
  experienceId,
  linked: initialLinked,
  unassigned: initialUnassigned,
}: {
  experienceId: string;
  linked: EventRow[];
  unassigned: EventRow[];
}) {
  const router = useRouter();
  const [linked, setLinked] = useState(initialLinked);
  const [unassigned, setUnassigned] = useState(initialUnassigned);
  const [pickerId, setPickerId] = useState("");
  const [busy, setBusy] = useState(false);

  async function link() {
    if (!pickerId) return;
    setBusy(true);
    await fetch(`/api/admin/events/${pickerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experienceId }),
    });
    const moved = unassigned.find((e) => e.id === pickerId);
    if (moved) {
      setLinked((l) => [...l, moved]);
      setUnassigned((u) => u.filter((e) => e.id !== pickerId));
    }
    setPickerId("");
    setBusy(false);
    router.refresh();
  }

  async function unlink(eventId: string) {
    setBusy(true);
    await fetch(`/api/admin/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experienceId: null }),
    });
    const moved = linked.find((e) => e.id === eventId);
    setLinked((l) => l.filter((e) => e.id !== eventId));
    if (moved) setUnassigned((u) => [...u, moved]);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card">
      <p className="section-title">Sorteios desta experiência</p>
      <p className="hint-text">
        Cada sorteio continua com sua própria landing page (banner, prêmios, cadastro) em{" "}
        <code>/e/[slug]</code>, sem nenhuma mudança - vincular aqui só agrupa qual sorteio aparece
        dentro de qual experiência.
      </p>

      <div className="list">
        {linked.map((ev) => (
          <div key={ev.id} className="row">
            <div className="info">
              <p className="name">{ev.name}</p>
              <p className="meta">
                {ev.campaign ? `${ev.campaign} · ` : ""}
                {ev.active ? "Ativo" : "Encerrado"}
              </p>
            </div>
            <Link href={`/admin/events/${ev.id}`} className="edit-link">
              Editar sorteio
            </Link>
            <button className="unlink" onClick={() => unlink(ev.id)} disabled={busy}>
              Desvincular
            </button>
          </div>
        ))}
        {linked.length === 0 && <p className="empty">Nenhum sorteio vinculado ainda.</p>}
      </div>

      {unassigned.length > 0 && (
        <div className="picker">
          <select value={pickerId} onChange={(e) => setPickerId(e.target.value)}>
            <option value="">Vincular um sorteio avulso…</option>
            {unassigned.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
          <Button onClick={link} disabled={!pickerId || busy}>
            Vincular
          </Button>
        </div>
      )}

      <style jsx>{`
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.1rem 1.25rem;
          margin-bottom: 1.75rem;
        }
        .section-title {
          font-size: 0.85rem;
          font-weight: 700;
          margin: 0 0 0.3rem;
        }
        .hint-text {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0 0 1rem;
          line-height: 1.5;
        }
        code {
          background: var(--bg);
          padding: 0.05rem 0.35rem;
          border-radius: 0.3rem;
        }
        .list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          margin-bottom: 1rem;
        }
        .row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 0.6rem;
          padding: 0.65rem 0.9rem;
        }
        .info {
          flex: 1;
          min-width: 0;
        }
        .name {
          margin: 0 0 0.15rem;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .meta {
          margin: 0;
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .edit-link {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--indigo-600);
          text-decoration: none;
          white-space: nowrap;
        }
        .unlink {
          font-size: 0.78rem;
          font-weight: 600;
          background: none;
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 0.35rem 0.8rem;
          cursor: pointer;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .unlink:hover:not(:disabled) {
          border-color: #c0392b;
          color: #c0392b;
        }
        .empty {
          color: var(--text-muted);
          font-size: 0.85rem;
          margin: 0;
        }
        .picker {
          display: flex;
          gap: 0.6rem;
        }
        select {
          flex: 1;
          padding: 0.6rem 0.7rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
        }
      `}</style>
    </div>
  );
}
