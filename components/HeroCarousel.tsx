"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface HeroEvent {
  id: string;
  slug: string;
  name: string;
  campaign: string | null;
  vip: boolean;
  bannerUrl: string | null;
  primary: string;
}

export function HeroCarousel({ events }: { events: HeroEvent[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (events.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % events.length), 6000);
    return () => clearInterval(t);
  }, [events.length]);

  if (events.length === 0) return null;

  return (
    <div className="hero">
      {events.map((ev, i) => (
        <Link
          key={ev.id}
          href={`/e/${ev.slug}/painel`}
          className={`slide ${i === index ? "active" : ""}`}
          aria-hidden={i !== index}
          tabIndex={i === index ? 0 : -1}
        >
          {ev.bannerUrl ? (
            <img src={ev.bannerUrl} alt="" className="bg" />
          ) : (
            <div className="bg-fallback" style={{ background: ev.primary }} />
          )}
          <div className="scrim" />
          <div className="content">
            {ev.vip && <span className="vip-badge">💎 VIP</span>}
            {ev.campaign && <span className="eyebrow">{ev.campaign}</span>}
            <h2>{ev.name}</h2>
            <span className="cta">Ver sorteio →</span>
          </div>
        </Link>
      ))}

      {events.length > 1 && (
        <div className="dots">
          {events.map((ev, i) => (
            <button
              key={ev.id}
              type="button"
              className={i === index ? "active" : ""}
              onClick={() => setIndex(i)}
              aria-label={`Ver ${ev.name}`}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .hero {
          position: relative;
          min-height: min(20rem, 46vh);
          border-radius: 1.25rem;
          overflow: hidden;
          margin-bottom: 2.5rem;
        }
        .slide {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          text-decoration: none;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.6s ease;
        }
        .slide.active {
          opacity: 1;
          pointer-events: auto;
        }
        .bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
        }
        .bg-fallback {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.55) 55%, rgba(10, 19, 48, 0.95) 95%);
          z-index: 1;
        }
        .content {
          position: relative;
          z-index: 2;
          width: 100%;
          padding: 2.5rem 2rem 2.25rem;
          color: white;
        }
        .vip-badge {
          display: inline-block;
          background: linear-gradient(135deg, #e8b646, #c9962f);
          color: #12121a;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.25rem 0.7rem;
          border-radius: 999px;
          margin-bottom: 0.6rem;
        }
        .eyebrow {
          display: block;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.72rem;
          opacity: 0.75;
          margin-bottom: 0.3rem;
        }
        .content h2 {
          margin: 0 0 0.6rem;
          font-family: "Sora", system-ui, sans-serif;
          font-size: clamp(1.4rem, 3vw, 2rem);
          line-height: 1.25;
        }
        .cta {
          display: inline-block;
          font-size: 0.85rem;
          font-weight: 700;
          color: white;
          border-bottom: 2px solid rgba(255, 255, 255, 0.5);
          padding-bottom: 0.15rem;
        }
        .dots {
          position: absolute;
          bottom: 1.1rem;
          right: 1.5rem;
          z-index: 3;
          display: flex;
          gap: 0.4rem;
        }
        .dots button {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.35);
          cursor: pointer;
          padding: 0;
        }
        .dots button.active {
          background: white;
          width: 1.35rem;
          border-radius: 999px;
          transition: width 0.25s ease;
        }
      `}</style>
    </div>
  );
}
