"use client";

import { useEffect, useState } from "react";

export function Countdown({ target }: { target: string }) {
  const [remaining, setRemaining] = useState<number>(() => new Date(target).getTime() - Date.now());

  useEffect(() => {
    const t = setInterval(() => setRemaining(new Date(target).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);

  if (remaining <= 0) {
    return <p className="soon">O sorteio já deve começar a qualquer momento.</p>;
  }

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remaining / (1000 * 60)) % 60);
  const seconds = Math.floor((remaining / 1000) % 60);

  return (
    <div className="countdown">
      <Unit value={days} label="dias" />
      <Unit value={hours} label="horas" />
      <Unit value={minutes} label="min" />
      <Unit value={seconds} label="seg" />
      <style jsx>{`
        .countdown {
          display: flex;
          justify-content: center;
          gap: 0.75rem;
        }
        .soon {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="unit">
      <strong>{String(value).padStart(2, "0")}</strong>
      <span>{label}</span>
      <style jsx>{`
        .unit {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 0.6rem;
          padding: 0.6rem 0.9rem;
          min-width: 3.5rem;
        }
        .unit strong {
          font-family: var(--font-mono, monospace);
          font-size: 1.5rem;
        }
        .unit span {
          font-size: 0.65rem;
          opacity: 0.6;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
