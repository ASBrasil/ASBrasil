"use client";

interface Ticket {
  name: string;
  number: number;
}

/**
 * A <details>/<summary> disclosure needs zero JS to open/close on its own,
 * but this one sits inside a whole-card <Link> in EventCard - without
 * stopping propagation, clicking the summary to expand it would also
 * trigger the card's navigation, since the click bubbles up into the
 * anchor. stopPropagation() on the wrapping <details> is enough: it never
 * reaches the <a>, so the browser never treats it as a link click.
 */
export function TicketBreakdown({ tickets }: { tickets: Ticket[] }) {
  return (
    <details className="breakdown" onClick={(e) => e.stopPropagation()}>
      <summary>
        Seus números ({tickets.length}): {tickets.map((t) => t.number).join(", ")}
      </summary>
      <ul>
        {tickets.map((t, i) => (
          <li key={i}>
            <span className="ticket-name">{t.name}</span>
            <span className="ticket-number">{t.number}</span>
          </li>
        ))}
      </ul>
      <style jsx>{`
        .breakdown {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
        }
        summary {
          cursor: pointer;
          list-style: none;
          font-family: monospace;
        }
        summary::-webkit-details-marker {
          display: none;
        }
        summary::after {
          content: " ▾ ver nomes";
          font-family: system-ui, sans-serif;
          color: #8b9aff;
          font-weight: 600;
        }
        .breakdown[open] summary::after {
          content: " ▴ ocultar nomes";
        }
        ul {
          list-style: none;
          margin: 0.5rem 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        li {
          display: flex;
          justify-content: space-between;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 0.4rem;
          padding: 0.3rem 0.55rem;
          font-family: system-ui, sans-serif;
        }
        .ticket-name {
          color: rgba(255, 255, 255, 0.85);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ticket-number {
          font-family: monospace;
          color: #8b9aff;
          font-weight: 600;
          flex-shrink: 0;
        }
      `}</style>
    </details>
  );
}
