"use client";

import { useEffect, useRef, useState } from "react";

export function EventsCarousel({ children }: { children: React.ReactNode[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const [manualPause, setManualPause] = useState(false);
  const [showArrows, setShowArrows] = useState(false);
  const [loop, setLoop] = useState(false);

  // Duplica a lista pra permitir loop infinito sem "pulo" visível: quando o
  // scroll passa da primeira cópia inteira, volta pro mesmo ponto na
  // segunda copia identica - o reset e imperceptivel. Mesma tecnica ja
  // usada no carrossel de cards e no run-line de vencedores.
  //
  // Só ativa a duplicação quando a lista de fato não cabe inteira na
  // largura visível - com poucos eventos (ex: 1-2 cards), duplicar sempre
  // fazia o mesmo card aparecer repetido lado a lado sem necessidade
  // nenhuma de rolagem, o que parecia "tudo duplicado" pro participante.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || children.length === 0) {
      setLoop(false);
      return;
    }
    // Mede com o conjunto único (nesse ponto `loop` ainda está no valor
    // anterior, então se já estava true a comparação usa scrollWidth/2).
    const singleSetWidth = loop ? el.scrollWidth / 2 : el.scrollWidth;
    setLoop(singleSetWidth > el.clientWidth + 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children.length]);

  const displayChildren = loop ? [...children, ...children] : children;

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    setShowArrows(loop ? el.scrollWidth / 2 > el.clientWidth + 4 : el.scrollWidth > el.clientWidth + 4);
  }, [children.length, loop]);

  useEffect(() => {
    if (!loop) return;
    const el = trackRef.current;
    if (!el) return;

    let raf: number;
    const speed = 0.5;

    function step() {
      if (el && !pausedRef.current) {
        el.scrollLeft += speed;
        const singleSetWidth = el.scrollWidth / 2;
        if (el.scrollLeft >= singleSetWidth) el.scrollLeft -= singleSetWidth;
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
  }, [loop, manualPause]);

  function scroll(dir: -1 | 1) {
    const el = trackRef.current;
    if (!el) return;
    pausedRef.current = true;
    setManualPause(true);
    el.scrollBy({ left: dir * 280, behavior: "smooth" });
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
          gap: "1.1rem",
          overflowX: "auto",
          scrollbarWidth: "none",
          paddingBottom: "0.25rem",
        }}
      >
        {displayChildren.map((child, i) => (
          <div key={i} style={{ flex: "0 0 16rem", minWidth: 0 }}>
            {child}
          </div>
        ))}
      </div>

      {showArrows && (
        <>
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Anterior"
            style={{
              position: "absolute",
              top: "50%",
              left: "-0.6rem",
              transform: "translateY(-50%)",
              width: "2.35rem",
              height: "2.35rem",
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(10,15,35,0.9)",
              color: "#fff",
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
              right: "-0.6rem",
              transform: "translateY(-50%)",
              width: "2.35rem",
              height: "2.35rem",
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(10,15,35,0.9)",
              color: "#fff",
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
