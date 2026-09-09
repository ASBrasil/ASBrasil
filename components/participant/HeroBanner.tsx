"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export interface HeroSlide {
  id: string;
  href: string;
  badge: string | null;
  name: string;
  subtitle: string | null;
  ctaLabel: string;
  bannerUrl: string | null;
  primary: string;
  secondary?: string;
  vip?: boolean;
}

/**
 * Banner único de ponta a ponta na home do participante. Antes existiam DOIS
 * carrosséis empilhados aqui - um edge-to-edge (Experiências) e outro
 * "encaixotado" logo abaixo (sorteios em destaque via Event.heroFeatured),
 * dando a impressão de dois banners disputando atenção. Esse componente
 * substitui os dois: mistura Experiências e sorteios em destaque num só
 * carrossel, no tamanho do banner de Experiências (edge-to-edge) com o
 * layout de conteúdo do banner antigo (texto sem coluna estreita, ocupando
 * a largura toda do slide) - que foi o que o Paulo preferiu.
 */
export function HeroBanner({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className="hero-banner">
      {slides.map((slide, i) => (
        <Link
          key={slide.id}
          href={slide.href}
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
              style={{
                background: slide.secondary
                  ? `linear-gradient(135deg, ${slide.primary}, ${slide.secondary})`
                  : slide.primary,
              }}
            />
          )}
          <div className="scrim" />
          {slide.vip && <span className="vip-badge">💎 VIP</span>}
          <div className="content">
            {slide.badge && <span className="badge">{slide.badge}</span>}
            <h2>{slide.name}</h2>
            {slide.subtitle && <p>{slide.subtitle}</p>}
            <span className="hero-cta">{slide.ctaLabel}</span>
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
          /* Proporção fixa em vez de altura em vw - assim o corte da imagem
             de fundo é previsível (sempre a mesma razão largura/altura),
             em vez de variar com a largura da tela. Uma imagem só, com o
             assunto principal centralizado, funciona nas duas. */
          aspect-ratio: 16 / 7;
        }
        @media (max-width: 640px) {
          .hero-banner {
            aspect-ratio: 4 / 3;
          }
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
          object-position: center;
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
          background: linear-gradient(0deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.2) 55%, transparent 80%);
          z-index: 1;
        }
        .vip-badge {
          position: absolute;
          top: 1.1rem;
          right: 1.25rem;
          z-index: 3;
          background: linear-gradient(135deg, #e8b646, #c9962f);
          color: #12121a;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.3rem 0.8rem;
          border-radius: 999px;
          box-shadow: 0 0.2rem 0.6rem rgba(0, 0, 0, 0.3);
        }
        .content {
          position: relative;
          z-index: 2;
          width: 100%;
          padding: clamp(1.4rem, 4vw, 2.75rem) clamp(1.2rem, 4vw, 3rem) clamp(1.6rem, 4vw, 2.5rem);
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
          margin: 0 0 0.4rem;
          color: #fff;
          font-family: "Sora", system-ui, sans-serif;
          font-size: clamp(1.5rem, 3.6vw, 2.35rem);
          line-height: 1.2;
        }
        .content p {
          margin: 0 0 1.1rem;
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.9rem;
          max-width: 34rem;
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
