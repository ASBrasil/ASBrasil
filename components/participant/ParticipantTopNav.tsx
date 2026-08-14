"use client";

import Link from "next/link";

export function ParticipantTopNav({ eventName }: { eventName: string }) {
  return (
    <header className="topnav">
      <Link href="/meus-eventos" className="back">
        <span aria-hidden>←</span> Meus eventos
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
          gap: 0.75rem;
          padding: 0.6rem 1rem;
          background: rgba(10, 15, 35, 0.75);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.8rem;
          position: sticky;
          top: 0;
          z-index: 30;
          backdrop-filter: blur(10px);
        }
        .back {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          color: inherit;
          text-decoration: none;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          padding: 0.35rem 0.8rem 0.35rem 0.65rem;
          font-weight: 600;
          font-size: 0.78rem;
          transition: border-color 0.15s, background 0.15s;
        }
        .back:hover {
          border-color: rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.1);
        }
        .current {
          margin-left: auto;
          margin-right: 0.25rem;
          opacity: 0.5;
          font-size: 0.75rem;
          max-width: 11rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .logout {
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: inherit;
          opacity: 0.75;
          border-radius: 999px;
          padding: 0.35rem 0.85rem;
          cursor: pointer;
          font-size: 0.75rem;
          transition: opacity 0.15s, border-color 0.15s;
        }
        .logout:hover {
          opacity: 1;
          border-color: rgba(255, 255, 255, 0.35);
        }
      `}</style>
    </header>
  );
}
