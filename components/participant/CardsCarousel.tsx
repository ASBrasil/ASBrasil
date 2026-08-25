"use client";

import { useEffect, useRef, useState } from "react";

interface CardItem {
  id: string;
  imageUrl: string | null;
  title: string;
  description: string;
  contentType?: "image" | "html";
  customHtml?: string;
}

const CARD_WIDTH_REM = 11; // largura fixa por card - tamanho consistente, independente de quantos existirem

export function CardsCarousel({
  cards,
  visibleCount,
  autoplay,
}: {
  cards: CardItem[];
  visibleCount: number;
  autoplay: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const [manualPause, setManualPause] = useState(false);

  // Duplica a lista pra permitir loop infinito sem "pulo" visível: quando o
  // scroll passa da primeira cópia inteira, volta pro início do mesmo ponto
  // (como as duas cópias são idênticas, o reset é imperceptível). Sempre
  // ativo agora - antes só rolava se "autoplay" estivesse marcado no admin,
  // o que fazia o carrossel parecer travado quando não estava.
  const loopable = cards.length > 0;
  const displayCards = loopable ? [...cards, ...cards] : cards;

  useEffect(() => {
    if (!loopable) return;
    const el = trackRef.current;
    if (!el) return;

    let raf: number;
    const speed = 0.35; // px por frame - bem devagar, continuo, sem pausas

    function step() {
      if (el && !pausedRef.current) {
        el.scrollLeft += speed;
        const singleSetWidth = el.scrollWidth / 2;
        if (el.scrollLeft >= singleSetWidth) {
          el.scrollLeft -= singleSetWidth;
        }
      }
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);

    const onEnter = () => (pausedRef.current = true);
    const onLeave = () => {
      if (!manualPause) pausedRef.current = false;
    };
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("touchstart", onEnter, { passive: true });
    el.addEventListener("touchend", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("touchstart", onEnter);
      el.removeEventListener("touchend", onLeave);
    };
  }, [loopable, manualPause]);

  function scroll(dir: -1 | 1) {
    const el = trackRef.current;
    if (!el) return;
    pausedRef.current = true;
    setManualPause(true);
    el.scrollBy({ left: dir * CARD_WIDTH_REM * 16, behavior: "smooth" });
    window.setTimeout(() => {
      pausedRef.current = false;
      setManualPause(false);
    }, 900);
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={trackRef}
        style={{
          display: "flex",
          gap: "1rem",
          overflowX: "auto",
          scrollbarWidth: "none",
          paddingBottom: "0.25rem",
        }}
      >
        {displayCards.map((card, i) => (
          <div
            key={`${card.id}-${i}`}
            style={{
              flex: `0 0 ${CARD_WIDTH_REM}rem`,
              width: `${CARD_WIDTH_REM}rem`,
              background: "var(--surface, #141b3d)",
              borderRadius: "1rem",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {card.contentType === "html" && card.customHtml ? (
              <div
                style={{ width: "100%", aspectRatio: "1 / 1", overflow: "hidden" }}
                dangerouslySetInnerHTML={{ __html: card.customHtml }}
              />
            ) : (
              card.imageUrl && (
                <img
                  src={card.imageUrl}
                  alt=""
                  style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }}
                />
              )
            )}
            {card.title && (
              <div style={{ padding: "0.85rem 0.9rem" }}>
                <h3 style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.4 }}>{card.title}</h3>
              </div>
            )}
          </div>
        ))}
      </div>

      {cards.length > visibleCount && (
        <>
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Anterior"
            style={{
              position: "absolute",
              top: "50%",
              left: "-0.5rem",
              transform: "translateY(-50%)",
              width: "2.25rem",
              height: "2.25rem",
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(10,15,35,0.85)",
              color: "inherit",
              cursor: "pointer",
              zIndex: 2,
            }}
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Próximo"
            style={{
              position: "absolute",
              top: "50%",
              right: "-0.5rem",
              transform: "translateY(-50%)",
              width: "2.25rem",
              height: "2.25rem",
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(10,15,35,0.85)",
              color: "inherit",
              cursor: "pointer",
              zIndex: 2,
            }}
          >
            →
          </button>
        </>
      )}
    </div>
  );
}
