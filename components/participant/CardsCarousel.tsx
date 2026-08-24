"use client";

import { useEffect, useRef } from "react";

interface CardItem {
  id: string;
  imageUrl: string | null;
  title: string;
  description: string;
  contentType?: "image" | "html";
  customHtml?: string;
}

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

  useEffect(() => {
    if (!autoplay) return;
    const el = trackRef.current;
    if (!el) return;
    let paused = false;
    const onEnter = () => (paused = true);
    const onLeave = () => (paused = false);
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("touchstart", onEnter, { passive: true });
    el.addEventListener("touchend", onLeave);

    const interval = setInterval(() => {
      if (paused) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: el.clientWidth / visibleCount, behavior: "smooth" });
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("touchstart", onEnter);
      el.removeEventListener("touchend", onLeave);
    };
  }, [autoplay, visibleCount]);

  function scroll(dir: -1 | 1) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: (el.clientWidth / visibleCount) * dir, behavior: "smooth" });
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={trackRef}
        style={{
          display: "flex",
          gap: "1rem",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          paddingBottom: "0.25rem",
        }}
      >
        {cards.map((card) => (
          <div
            key={card.id}
            style={{
              flex: `0 0 calc((100% - ${(visibleCount - 1) * 1}rem) / ${visibleCount})`,
              minWidth: "9rem",
              scrollSnapAlign: "start",
              background: "var(--surface, #141b3d)",
              borderRadius: "1rem",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "1.1rem 1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              minHeight: "3.5rem",
            }}
          >
            {card.title && (
              <h3 style={{ margin: 0, fontSize: "1rem", lineHeight: 1.4 }}>{card.title}</h3>
            )}
          </div>
        ))}
      </div>

      {cards.length > visibleCount && (
        <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginTop: "0.85rem" }}>
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Anterior"
            style={{
              width: "2.25rem",
              height: "2.25rem",
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.06)",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Próximo"
            style={{
              width: "2.25rem",
              height: "2.25rem",
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.06)",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
