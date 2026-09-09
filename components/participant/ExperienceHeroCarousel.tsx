"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export interface ExperienceHeroSlide {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  bannerUrl: string | null;
  primary: string;
  secondary: string;
}

/**
 * Banner de ponta a ponta (edge-to-edge) mostrado na home do participante,
 * entre a barra de navegação e o resto do conteúdo - uma experiência por
 * slide, trocando sozinho. Fica ADITIVO ao <HeroCarousel> antigo (esse aqui
 * é só das Experiences; o antigo continua igual, mostrando sorteios com
 * heroFeatured=true).
 */
export function ExperienceHeroCarousel({ slides }: { slides: ExperienceHeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function start() {
    stop();
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5000);
  }
  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  useEffect(() => {
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className="hero-banner" onMouseEnter={stop} onMouseLeave={start}>
      <div className="hero-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((slide) => (
          <Link
            key={slide.id}
            href={`/eventos/${slide.slug}`}
            className="hero-slide"
            style={{
              background: slide.bannerUrl
                ? `url(${slide.bannerUrl}) center/cover`
                : `linear-gradient(135deg, ${slide.primary}, ${slide.secondary})`,
            }}
          >
            <div className="hero-content">
              <span className="badge">Experiência</span>
              <h2>{slide.name}</h2>
              {slide.subtitle && <p>{slide.subtitle}</p>}
              <span className="hero-cta">Ver experiência →</span>
            </div>
          </Link>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="hero-dots">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              className={`hero-dot ${i === index ? "active" : ""}`}
              aria-label={`Ver ${slide.name}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .hero-banner {
          position: relative;
          width: 100%;
          overflow: hidden;
          height: clamp(15rem, 30vw, 24rem);
        }
        .hero-track {
          display: flex;
          height: 100%;
          width: 100%;
          transition: transform 0.65s cubic-bezier(0.65, 0, 0.35, 1);
        }
        .hero-slide {
          flex: 0 0 100%;
          height: 100%;
          position: relative;
          display: flex;
          align-items: flex-end;
          padding: clamp(1.6rem, 4vw, 3rem);
          overflow: hidden;
          text-decoration: none;
        }
        .hero-slide::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(0deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.1) 55%, transparent 75%);
        }
        .hero-content {
          position: relative;
          z-index: 1;
          max-width: 34rem;
        }
        .badge {
          display: inline-block;
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: rgba(0, 0, 0, 0.4);
          color: #fff;
          border-radius: 999px;
          padding: 0.28rem 0.7rem;
          margin-bottom: 0.9rem;
        }
        .hero-content :global(h2) {
          color: #fff;
          font-family: "Sora", system-ui, sans-serif;
          font-size: clamp(1.5rem, 3.4vw, 2.35rem);
          margin: 0 0 0.5rem;
        }
        .hero-content :global(p) {
          color: rgba(255, 255, 255, 0.85);
          margin: 0 0 1.1rem;
          font-size: 0.92rem;
          max-width: 28rem;
        }
        .hero-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.82rem;
          font-weight: 700;
          color: #12121a;
          background: #fff;
          border-radius: 999px;
          padding: 0.55rem 1.15rem;
        }
        .hero-dots {
          position: absolute;
          right: clamp(1.2rem, 3vw, 2.2rem);
          bottom: 1.3rem;
          z-index: 2;
          display: flex;
          gap: 0.4rem;
        }
        .hero-dot {
          width: 0.5rem;
          height: 0.5rem;
          padding: 0;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          transition: width 0.2s, background 0.2s;
        }
        .hero-dot.active {
          width: 1.5rem;
          border-radius: 999px;
          background: #fff;
        }
      `}</style>
    </div>
  );
}
