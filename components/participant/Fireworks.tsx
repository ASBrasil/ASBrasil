"use client";

import { useMemo } from "react";

interface Particle {
  id: number;
  left: string;
  top: string;
  dx: number;
  dy: number;
  delay: number;
  color: string;
}

const COLORS = ["#f97316", "#facc15", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
const BURST_ORIGINS = [
  { left: "18%", top: "28%" },
  { left: "50%", top: "16%" },
  { left: "82%", top: "30%" },
];
const PARTICLES_PER_BURST = 14;

/**
 * Pure CSS burst - no canvas, no confetti library. Particles fly outward
 * from a few fixed points and fade, once, then this unmounts (the parent
 * is responsible for that timing). Random angles/colors are computed once
 * via useMemo so re-renders don't restart the animation mid-burst.
 */
export function Fireworks() {
  const particles = useMemo<Particle[]>(() => {
    const list: Particle[] = [];
    let id = 0;
    BURST_ORIGINS.forEach((origin, burstIndex) => {
      for (let i = 0; i < PARTICLES_PER_BURST; i++) {
        const angle = (360 / PARTICLES_PER_BURST) * i + (Math.random() * 14 - 7);
        const distance = 55 + Math.random() * 45;
        const rad = (angle * Math.PI) / 180;
        list.push({
          id: id++,
          left: origin.left,
          top: origin.top,
          dx: Math.cos(rad) * distance,
          dy: Math.sin(rad) * distance,
          delay: burstIndex * 0.25 + Math.random() * 0.1,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
    });
    return list;
  }, []);

  return (
    <div className="fireworks" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={
            {
              left: p.left,
              top: p.top,
              background: p.color,
              animationDelay: `${p.delay}s`,
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
            } as React.CSSProperties
          }
        />
      ))}

      <style jsx>{`
        .fireworks {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 100;
        }
        .particle {
          position: absolute;
          width: 0.45rem;
          height: 0.45rem;
          border-radius: 50%;
          opacity: 0;
          animation: burst 1.15s ease-out forwards;
          box-shadow: 0 0 0.4rem currentColor;
        }
        @keyframes burst {
          0% {
            transform: translate(0, 0) scale(0.6);
            opacity: 1;
          }
          65% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--dx), calc(var(--dy) + 3rem)) scale(0.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
