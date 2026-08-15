"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PrizeDuplicateButton({ prizeId }: { prizeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function duplicate() {
    setBusy(true);
    const res = await fetch(`/api/admin/prizes/${prizeId}/duplicate`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      alert("Não foi possível duplicar o prêmio.");
      return;
    }
    router.refresh();
  }

  return (
    <button type="button" className="duplicate-btn" onClick={duplicate} disabled={busy}>
      {busy ? "…" : "📋 Duplicar"}
      <style jsx>{`
        .duplicate-btn {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-muted);
          border-radius: 999px;
          padding: 0.4rem 0.85rem;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          margin-left: 0.5rem;
        }
        .duplicate-btn:hover:not(:disabled) {
          border-color: var(--indigo-600);
          color: var(--text);
        }
        .duplicate-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }
      `}</style>
    </button>
  );
}
