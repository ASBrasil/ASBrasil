"use client";

import { useEffect, useRef } from "react";

export function WinnersMarquee({ items }: { items: string[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (items.length === 0) return;
    const el = trackRef.current;
    if (!el) return;
    let raf: number;
    let paused = false;
    const onEnter = () => (paused = true);
    const onLeave = () => (paused = false);
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);

    function step() {
      if (el && !paused) {
        el.scrollLeft += 0.5;
        const singleSetWidth = el.scrollWidth / 2;
        if (el.scrollLeft >= singleSetWidth) el.scrollLeft -= singleSetWidth;
      }
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [items.length]);

  if (items.length === 0) return null;
  const doubled = [...items, ...items];

  return (
    <div
      ref={trackRef}
      style={{
        display: "flex",
        gap: "0.75rem",
        overflowX: "hidden",
        padding: "0.5rem 0",
        maskImage: "linear-gradient(90deg, transparent, black 6%, black 94%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, black 6%, black 94%, transparent)",
      }}
    >
      {doubled.map((text, i) => (
        <span
          key={i}
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            borderRadius: "999px",
            padding: "0.5rem 1.1rem",
            fontSize: "0.82rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
            color: "rgba(255, 255, 255, 0.85)",
          }}
        >
          🎉 {text}
        </span>
      ))}
    </div>
  );
}
