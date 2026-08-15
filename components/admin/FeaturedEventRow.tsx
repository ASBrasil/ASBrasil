"use client";

import { useState } from "react";

interface EventData {
  id: string;
  name: string;
  campaign: string | null;
  active: boolean;
  featuredOnLogin: boolean;
  loginBannerText: string | null;
}

export function FeaturedEventRow({ event }: { event: EventData }) {
  const [featured, setFeatured] = useState(event.featuredOnLogin);
  const [text, setText] = useState(event.loginBannerText ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const fallback = event.campaign ? `${event.campaign} — ${event.name}` : event.name;

  async function patch(data: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/admin/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setBusy(false);
  }

  async function toggleFeatured() {
    const next = !featured;
    setFeatured(next); // otimista - a chamada raramente falha e isso evita esperar pra ver o clique responder
    await patch({ featuredOnLogin: next });
  }

  async function saveText() {
    await patch({ loginBannerText: text.trim() || null });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className={`row ${featured ? "" : "dimmed"}`}>
      <div className="row-top">
        <div className="info">
          {event.campaign && <span className="campaign">{event.campaign}</span>}
          <span className="name">{event.name}</span>
          {!event.active && <span className="draft-badge">Rascunho</span>}
        </div>
        <button
          type="button"
          className={`toggle ${featured ? "on" : ""}`}
          onClick={toggleFeatured}
          disabled={busy}
          aria-pressed={featured}
          aria-label="Mostrar no banner de login"
        >
          <span className="knob" />
        </button>
      </div>

      {featured && (
        <div className="text-row">
          <input
            type="text"
            value={text}
            placeholder={fallback}
            maxLength={120}
            onChange={(e) => setText(e.target.value)}
            onBlur={saveText}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            disabled={busy}
          />
          {saved && <span className="saved-tag">Salvo ✓</span>}
        </div>
      )}

      <style jsx>{`
        .row {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 0.9rem 1.1rem;
        }
        .row.dimmed {
          opacity: 0.7;
        }
        .row-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .info {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          min-width: 0;
        }
        .campaign {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--indigo-600);
          flex-shrink: 0;
        }
        .name {
          color: var(--text);
          font-weight: 600;
          font-size: 0.92rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .draft-badge {
          font-size: 0.7rem;
          color: var(--text-muted);
          background: var(--bg);
          border-radius: 999px;
          padding: 0.15rem 0.55rem;
          flex-shrink: 0;
        }
        .toggle {
          width: 2.5rem;
          height: 1.4rem;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--bg);
          padding: 0.15rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          flex-shrink: 0;
          transition: background 0.15s, border-color 0.15s;
        }
        .toggle.on {
          background: var(--indigo-600);
          border-color: var(--indigo-600);
        }
        .toggle:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .knob {
          width: 1rem;
          height: 1rem;
          border-radius: 50%;
          background: white;
          display: block;
          transition: transform 0.15s;
        }
        .toggle.on .knob {
          transform: translateX(1.1rem);
        }
        .text-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border);
        }
        .text-row input {
          flex: 1;
          padding: 0.5rem 0.7rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text);
          font-size: 0.85rem;
        }
        .saved-tag {
          font-size: 0.75rem;
          color: #16a34a;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
