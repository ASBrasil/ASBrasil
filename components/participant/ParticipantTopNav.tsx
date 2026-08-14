"use client";

import Link from "next/link";

export function ParticipantTopNav({ eventName }: { eventName: string }) {
  return (
    <header className="topnav">
      <Link href="/meus-eventos" className="back">
        ← Meus eventos
      </Link>
      <span className="current">{eventName}</span>
      <form action="/api/public/session" method="post">
        <button formMethod="delete" className="logout">
          Sair
        </button>
      </form>

      <style jsx>{`
        .topnav {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.5rem;
          background: rgba(255, 255, 255, 0.04);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.85rem;
        }
        .back {
          color: inherit;
          text-decoration: none;
          opacity: 0.85;
        }
        .current {
          margin-left: auto;
          margin-right: 1rem;
          opacity: 0.6;
          font-size: 0.8rem;
        }
        .logout {
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: inherit;
          border-radius: 0.5rem;
          padding: 0.4rem 0.8rem;
          cursor: pointer;
          font-size: 0.8rem;
        }
      `}</style>
    </header>
  );
}
