"use client";

import Link from "next/link";

export function ParticipantTopNav({ eventName }: { eventName: string }) {
  return (
    <header className="topnav">
      <div className="left">
        <Link
          href="/meus-eventos"
          className="back"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            color: "#12121a",
            textDecoration: "none",
            background: "var(--primary, #4f5fff)",
            borderRadius: "999px",
            padding: "0.45rem 1rem",
            fontWeight: 700,
            fontSize: "0.78rem",
            flexShrink: 0,
          }}
        >
          ← Meus eventos
        </Link>
        <a
          href="https://app.asbrasil.tur.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="reservas"
        >
          Minhas reservas ↗
        </a>
        <Link
          href="/vencedores"
          className="winners"
          style={{
            display: "inline-flex",
            alignItems: "center",
            color: "#f5cf87",
            textDecoration: "none",
            background: "rgba(232, 182, 70, 0.1)",
            border: "1px solid rgba(232, 182, 70, 0.35)",
            borderRadius: "999px",
            padding: "0.43rem 0.9rem",
            fontWeight: 700,
            fontSize: "0.76rem",
            flexShrink: 0,
          }}
        >
          🏆 Vencedores
        </Link>
      </div>
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
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.65rem 1.25rem;
          background: rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.78rem;
          flex-wrap: wrap;
        }
        .left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .reservas {
          display: inline-flex;
          align-items: center;
          color: inherit;
          text-decoration: none;
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 999px;
          padding: 0.43rem 0.9rem;
          font-weight: 600;
          font-size: 0.76rem;
          flex-shrink: 0;
          opacity: 0.9;
          transition: opacity 0.15s, border-color 0.15s;
        }
        .reservas:hover {
          opacity: 1;
          border-color: rgba(255, 255, 255, 0.45);
        }
        .right {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          min-width: 0;
        }
        .current {
          opacity: 0.7;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 600;
          max-width: 11rem;
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
          padding: 0.4rem 0.9rem;
          cursor: pointer;
          font-size: 0.75rem;
          flex-shrink: 0;
          transition: opacity 0.15s, border-color 0.15s;
        }
        .logout:hover {
          opacity: 1;
          border-color: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </header>
  );
}
