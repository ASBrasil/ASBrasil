"use client";

import { useEffect, useState } from "react";
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
 * slide, trocando sozinho. Usa o MESMO mecanismo de crossfade (slides
 * absolutos, opacidade) do <HeroCarousel> antigo, em vez de flex+transform -
 * fica ADITIVO a ele (esse aqui é só das Experiences; o antigo continua
 * igual, mostrando sorteios com heroFeatured=true).
 */
export function ExperienceHeroCarousel({ slides }: { slides: ExperienceHeroSlide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className="hero-banner">
      {slides.map((slide, i) => (
        <Link
          key={slide.id}
          href={`/eventos/${slide.slug}`}
          className="slide"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "flex-end",
            textDecoration: "none",
            opacity: i === index ? 1 : 0,
            pointerEvents: i === index ? "auto" : "none",
            transition: "opacity 0.8s ease",
          }}
          aria-hidden={i !== index}
          tabIndex={i === index ? 0 : -1}
        >
          {slide.bannerUrl ? (
            <img src={slide.bannerUrl} alt="" className="bg" />
          ) : (
            <div
              className="bg-fallback"
              style={{ background: `linear-gradient(135deg, ${slide.primary}, ${slide.secondary})` }}
            />
          )}
          <div className="scrim" />
          <div className="content">
            <span className="badge">Experiência</span>
            <h2>{slide.name}</h2>
            {slide.subtitle && <p>{slide.subtitle}</p>}
            <span className="hero-cta">Ver experiência →</span>
          </div>
        </Link>
      ))}

      {slides.length > 1 && (
        <div className="dots">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              className={i === index ? "active" : ""}
              onClick={() => setIndex(i)}
              aria-label={`Ver ${slide.name}`}
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
        .slide {
          text-decoration: none;
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
          background: linear-gradient(0deg, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0.15) 55%, transparent 80%);
          z-index: 1;
        }
        .content {
          position: relative;
          z-index: 2;
          max-width: 34rem;
          padding: clamp(1.6rem, 4vw, 3rem);
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
        .content h2 {
          margin: 0 0 0.5rem;
          color: #fff;
          font-family: "Sora", system-ui, sans-serif;
          font-size: clamp(1.5rem, 3.4vw, 2.35rem);
          line-height: 1.2;
        }
        .content p {
          margin: 0 0 1.1rem;
          color: rgba(255, 255, 255, 0.85);
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
        .dots {
          position: absolute;
          right: clamp(1.2rem, 3vw, 2.2rem);
          bottom: 1.3rem;
          z-index: 3;
          display: flex;
          gap: 0.4rem;
        }
        .dots button {
          width: 0.5rem;
          height: 0.5rem;
          padding: 0;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          transition: width 0.2s, background 0.2s;
        }
        .dots button.active {
          width: 1.5rem;
          border-radius: 999px;
          background: #fff;
        }
      `}</style>
    </div>
  );
}
