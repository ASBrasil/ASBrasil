"use client";

import Link from "next/link";

const navLinkBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
  textDecoration: "none",
  borderRadius: "999px",
  padding: "0.48rem 1.05rem",
  fontWeight: 700,
  fontSize: "0.8rem",
  whiteSpace: "nowrap",
  transition: "border-color 0.15s, background 0.15s",
};

export function ParticipantTopNav({ eventName }: { eventName: string }) {
  return (
    <header className="topnav">
      <Link
        href="/meus-eventos"
        className="brand"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          textDecoration: "none",
          color: "#fff",
          fontWeight: 800,
          fontSize: "0.85rem",
          letterSpacing: "0.03em",
          justifySelf: "start",
        }}
      >
        <span aria-hidden style={{ color: "var(--primary, #4f5fff)" }}>
          ●
        </span>
        AS BRASIL
      </Link>

      <nav className="center-nav">
        <Link
          href="/meus-eventos"
          style={{
            ...navLinkBase,
            color: "#12121a",
            background: "linear-gradient(135deg, var(--primary, #4f5fff), color-mix(in srgb, var(--primary, #4f5fff) 100%, black 28%))",
          }}
        >
          ← Meus eventos
        </Link>
        <a
          href="https://app.asbrasil.tur.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="reservas-link"
        >
          Minhas reservas ↗
        </a>
        <Link
          href="/vencedores"
          style={{
            ...navLinkBase,
            color: "#f5cf87",
            background: "rgba(232, 182, 70, 0.1)",
            border: "1px solid rgba(232, 182, 70, 0.35)",
          }}
        >
          🏆 Vencedores
        </Link>
      </nav>

      <div className="right">
        <span className="current">{eventName}</span>
        <form action="/api/public/session" method="post">
          <button className="logout">Sair</button>
        </form>
      </div>

      <style jsx>{`
        .topnav {
          position: sticky;
          top: 0;
          z-index: 40;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.5rem;
          background: rgba(8, 12, 30, 0.72);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .brand {
          justify-self: start;
        }
        .center-nav {
          justify-self: center;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        .reservas-link {
          display: inline-flex;
          align-items: center;
          color: inherit;
          text-decoration: none;
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 999px;
          padding: 0.46rem 1.05rem;
          font-weight: 600;
          font-size: 0.8rem;
          white-space: nowrap;
          opacity: 0.9;
          transition: opacity 0.15s, border-color 0.15s;
        }
        .reservas-link:hover {
          opacity: 1;
          border-color: rgba(255, 255, 255, 0.45);
        }
        .right {
          justify-self: end;
          display: flex;
          align-items: center;
          gap: 0.9rem;
          min-width: 0;
        }
        .current {
          opacity: 0.65;
          font-size: 0.74rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 600;
          max-width: 10rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .logout {
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: inherit;
          opacity: 0.85;
          border-radius: 999px;
          padding: 0.42rem 1rem;
          cursor: pointer;
          font-size: 0.78rem;
          flex-shrink: 0;
          transition: opacity 0.15s, border-color 0.15s;
        }
        .logout:hover {
          opacity: 1;
          border-color: rgba(255, 255, 255, 0.4);
        }

        @media (max-width: 860px) {
          .topnav {
            grid-template-columns: 1fr auto;
            grid-template-areas: "brand right" "nav nav";
            row-gap: 0.75rem;
          }
          .brand {
            grid-area: brand;
          }
          .right {
            grid-area: right;
          }
          .center-nav {
            grid-area: nav;
            justify-self: stretch;
            justify-content: flex-start;
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 0.15rem;
          }
          .current {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
