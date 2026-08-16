"use client";

import { useEffect, useState } from "react";
import { playTick, playLockThunk } from "@/lib/drawSound";

/**
 * The signature visual for the app: each digit of the winning number spins
 * independently, like the wheels of an old raffle drum, and locks in one at
 * a time from left to right instead of all snapping into place together.
 * That staggered lock is what sells the "drum" read rather than a generic
 * slot machine.
 */
export function DrawReveal({
  winningNumber,
  onSettled,
}: {
  winningNumber: number;
  onSettled?: () => void;
}) {
  const digits = String(winningNumber).split("");
  const [locked, setLocked] = useState(0); // how many digits (from the left) are locked

  useEffect(() => {
    if (locked >= digits.length) {
      const t = setTimeout(() => onSettled?.(), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setLocked((l) => l + 1);
      playLockThunk(); // um "clunk" mais grave a cada dígito que trava
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  // Catraca contínua enquanto ainda tem dígito girando - dá o clima de
  // "roleta de verdade" entre um travamento e outro, não só nos cliques
  // de lock. Some sozinho assim que o último dígito trava.
  useEffect(() => {
    if (locked >= digits.length) return;
    const t = setInterval(() => playTick(), 130);
    return () => clearInterval(t);
  }, [locked, digits.length]);

  return (
    <div className="draw-reveal" role="status" aria-live="polite">
      {digits.map((d, i) => (
        <Digit key={i} target={d} isLocked={i < locked} delay={i * 90} />
      ))}
      <style jsx>{`
        .draw-reveal {
          display: flex;
          gap: 0.5rem;
        }
        @media (prefers-reduced-motion: reduce) {
          .draw-reveal :global(.digit-track) {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function Digit({ target, isLocked, delay }: { target: string; isLocked: boolean; delay: number }) {
  return (
    <div
      className="digit-window"
      style={{
        width: "3rem",
        height: "4.25rem",
        overflow: "hidden",
        borderRadius: "0.5rem",
        background: "var(--surface, #1B1B26)",
        border: "1px solid color-mix(in srgb, var(--primary, #E8B646) 35%, transparent)",
        position: "relative",
      }}
    >
      <div
        className="digit-track"
        style={{
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "2.5rem",
          fontWeight: 700,
          color: "var(--primary, #E8B646)",
          lineHeight: "4.25rem",
          textAlign: "center",
          animation: isLocked ? "none" : "spin 0.35s linear infinite",
          animationDelay: `${delay}ms`,
          transform: isLocked ? "translateY(0)" : undefined,
        }}
      >
        {isLocked ? (
          <span>{target}</span>
        ) : (
          "0123456789".split("").map((d, i) => <span key={i}>{d}</span>)
        )}
      </div>
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-38.25rem); /* 9 digits * 4.25rem */
          }
        }
      `}</style>
    </div>
  );
}
