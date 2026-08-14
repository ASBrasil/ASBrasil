"use client";

import { useState } from "react";
import { ParticipantsTable } from "@/components/ParticipantsTable";
import { ParticipantsStep } from "@/components/wizard/ParticipantsStep";

export function ParticipantsPageClient({ eventId }: { eventId: string }) {
  const [importing, setImporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <div className="toolbar">
        <button type="button" className="import-toggle" onClick={() => setImporting((v) => !v)}>
          {importing ? "✕ Fechar importação" : "+ Importar participantes"}
        </button>
      </div>

      {importing && (
        <div className="panel">
          <ParticipantsStep
            eventId={eventId}
            onDone={() => {
              setImporting(false);
              setRefreshKey((k) => k + 1); // remounts the table below, forcing a refetch
            }}
          />
        </div>
      )}

      <ParticipantsTable key={refreshKey} eventId={eventId} />

      <style jsx>{`
        .toolbar {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 1rem;
        }
        .import-toggle {
          background: var(--indigo-600);
          color: white;
          border: none;
          border-radius: 999px;
          padding: 0.6rem 1.2rem;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
        }
        .panel {
          margin-bottom: 1.5rem;
        }
      `}</style>
    </div>
  );
}
