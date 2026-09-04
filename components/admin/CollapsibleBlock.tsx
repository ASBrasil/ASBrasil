"use client";

import { useState } from "react";

/**
 * Wrapper genérico "clica pra expandir", usado pra esconder blocos grandes
 * (ex: a matriz de participante x missão) até o admin realmente precisar
 * olhar - sem isso, uma tabela com muita gente/muita missão vira uma
 * parede de conteúdo logo no topo do dashboard do evento.
 */
export function CollapsibleBlock({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="collapsible">
      <button type="button" className="toggle" onClick={() => setOpen((o) => !o)}>
        <span className={`arrow ${open ? "open" : ""}`}>{open ? "▾" : "▸"}</span>
        {title}
      </button>
      {open && <div className="body">{children}</div>}

      <style jsx>{`
        .collapsible {
          margin-bottom: 1rem;
        }
        .toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: 1px dashed var(--border);
          border-radius: 0.6rem;
          padding: 0.7rem 1rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
          width: 100%;
          text-align: left;
        }
        .toggle:hover {
          border-color: var(--indigo-600);
          color: var(--text);
        }
        .arrow {
          display: inline-block;
        }
        .body {
          margin-top: 0.6rem;
        }
      `}</style>
    </div>
  );
}
