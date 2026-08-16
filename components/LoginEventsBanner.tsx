"use client";

import { useEffect, useState } from "react";

interface FeaturedEvent {
  id: string;
  name: string;
  campaign: string | null;
  slug: string;
  loginBannerText: string | null;
}

export function LoginEventsBanner({ events }: { events: FeaturedEvent[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (events.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % events.length), 4000);
    return () => clearInterval(t);
  }, [events.length]);

  if (events.length === 0) return null;
  const current = events[index];

  return (
    <div className="banner">
      <span className="label">Sorteando agora</span>
      <div className="rotator">
        <a
          key={current.id}
          href={`/e/${current.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="event-name"
        >
          {current.loginBannerText || (current.campaign ? `${current.campaign} — ${current.name}` : current.name)}
        </a>
      </div>
      {events.length > 1 && (
        <div className="dots">
          {events.map((e, i) => (
            <span key={e.id} className={`dot ${i === index ? "active" : ""}`} />
          ))}
        </div>
      )}

      <style jsx>{`
        .banner {
          margin-top: 0;
        }
        .label {
          display: block;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          opacity: 0.5;
          margin-bottom: 0.6rem;
        }
        .rotator {
          min-height: 1.6rem;
        }
        .event-name {
          display: inline-block;
          color: white;
          text-decoration: none;
          font-weight: 600;
          font-size: 1rem;
          animation: fadeIn 0.4s ease;
        }
        .event-name:hover {
          text-decoration: underline;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .dots {
          display: flex;
          gap: 0.35rem;
          margin-top: 0.85rem;
        }
        .dot {
          width: 0.4rem;
          height: 0.4rem;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.25);
        }
        .dot.active {
          background: rgba(255, 255, 255, 0.85);
        }
      `}</style>
    </div>
  );
}
