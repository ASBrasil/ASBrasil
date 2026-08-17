"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EventData {
  id: string;
  name: string;
  campaign: string | null;
  heroFeatured: boolean;
  bannerUrl: string | null;
  primary: string;
}

export function HeroFeaturedRow({ event }: { event: EventData }) {
  const router = useRouter();
  const [featured, setFeatured] = useState(event.heroFeatured);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !featured;
    setFeatured(next); // otimista
    setBusy(true);
    await fetch(`/api/admin/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heroFeatured: next }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className={`row ${featured ? "" : "dimmed"}`}>
      {event.bannerUrl ? (
        <img src={event.bannerUrl} alt="" className="thumb" />
      ) : (
        <div className="thumb placeholder" style={{ background: event.primary }} />
      )}
      <div className="info">
        {event.campaign && <span className="campaign">{event.campaign}</span>}
        <span className="name">{event.name}</span>
        {!event.bannerUrl && <span className="no-banner">Sem imagem de banner configurada</span>}
      </div>
      <button
        type="button"
        className={`toggle ${featured ? "on" : ""}`}
        onClick={toggle}
        disabled={busy}
        aria-pressed={featured}
        aria-label="Mostrar no banner rotativo"
      >
        <span className="knob" />
      </button>

      <style jsx>{`
        .row {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 0.75rem 1.1rem;
        }
        .row.dimmed {
          opacity: 0.75;
        }
        .thumb {
          width: 5rem;
          height: 3rem;
          border-radius: 0.5rem;
          object-fit: cover;
          flex-shrink: 0;
        }
        .thumb.placeholder {
          opacity: 0.5;
        }
        .info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .campaign {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--indigo-600);
        }
        .name {
          font-weight: 600;
          font-size: 0.92rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .no-banner {
          font-size: 0.75rem;
          color: #b45309;
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
      `}</style>
    </div>
  );
}
