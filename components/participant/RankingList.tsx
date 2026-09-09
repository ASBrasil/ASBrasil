"use client";

import { useState } from "react";
import type { RankingEntry } from "@/lib/ranking";

const MEDALS = ["🥇", "🥈", "🥉"];

export function RankingList({
  entries,
  highlightEmail,
  emptyText = "Ninguém pontuou aqui ainda - seja o primeiro!",
}: {
  entries: RankingEntry[];
  highlightEmail?: string | null;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);

  if (entries.length === 0) {
    return <p className="empty">{emptyText}</p>;
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="ranking">
      {top3.map((entry) => (
        <Row key={entry.email} entry={entry} highlighted={entry.email === highlightEmail} />
      ))}

      {rest.length > 0 && (
        <>
          <div className={`extra-wrap ${open ? "open" : ""}`}>
            <div className="extra-inner">
              {rest.map((entry) => (
                <Row key={entry.email} entry={entry} highlighted={entry.email === highlightEmail} />
              ))}
            </div>
          </div>

          <button className="toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? "Ver menos" : `Ver mais (${rest.length})`}
            <svg
              className={`chevron ${open ? "open" : ""}`}
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
            >
              <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}

      <style jsx>{`
        .ranking {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .empty {
          color: rgba(255, 255, 255, 0.55);
          font-size: 0.88rem;
          margin: 0;
        }
        .extra-wrap {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.28s ease;
        }
        .extra-wrap.open {
          grid-template-rows: 1fr;
        }
        .extra-inner {
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .extra-wrap.open .extra-inner {
          padding-top: 0.5rem;
        }
        .toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          align-self: flex-start;
          margin-top: 0.35rem;
          background: none;
          border: none;
          color: #8b9aff;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          padding: 0.2rem 0;
        }
        .chevron {
          transition: transform 0.2s;
        }
        .chevron.open {
          transform: rotate(180deg);
        }
      `}</style>
    </div>
  );
}

function Row({ entry, highlighted }: { entry: RankingEntry; highlighted?: boolean }) {
  return (
    <div className={`row ${highlighted ? "me" : ""}`}>
      <span className="rank">{MEDALS[entry.rank - 1] ?? `#${entry.rank}`}</span>
      <span className="name">{entry.label}</span>
      <span className="xp">{entry.xp} pts</span>

      <style jsx>{`
        .row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0.6rem;
          padding: 0.6rem 0.9rem;
        }
        .row.me {
          border-color: #4f5fff;
          background: rgba(79, 95, 255, 0.12);
        }
        .rank {
          width: 1.6rem;
          text-align: center;
          font-size: 0.9rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .name {
          flex: 1;
          min-width: 0;
          font-size: 0.88rem;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .xp {
          font-size: 0.8rem;
          font-weight: 700;
          color: #f5cf87;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
