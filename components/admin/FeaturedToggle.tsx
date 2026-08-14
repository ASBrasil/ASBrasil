"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FeaturedToggle({ eventId, featured }: { eventId: string; featured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await fetch(`/api/admin/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featuredOnLogin: !featured }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      className={`toggle ${featured ? "on" : ""}`}
      onClick={toggle}
      disabled={busy}
      aria-pressed={featured}
    >
      <span className="knob" />
      <style jsx>{`
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
    </button>
  );
}
