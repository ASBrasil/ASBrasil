"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PrizeReorderButtons({
  prizeId,
  isFirst,
  isLast,
}: {
  prizeId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function move(direction: "up" | "down") {
    setBusy(true);
    await fetch(`/api/admin/prizes/${prizeId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
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

      <style jsx>{`
        .reorder {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        button {
          width: 1.6rem;
          height: 1.4rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 0.35rem;
          color: var(--text-muted);
          font-size: 0.65rem;
          cursor: pointer;
          line-height: 1;
          padding: 0;
        }
        button:hover:not(:disabled) {
          border-color: var(--indigo-600);
          color: var(--text);
        }
        button:disabled {
          opacity: 0.3;
          cursor: default;
        }
      `}</style>
    </div>
  );
}
