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

  // Últimos 60s: entra em modo "suspense" - pulsa mais rápido e forte
  // conforme o tempo esgota, pra dar aquele clima de "já vai, já vai".
  const final = remaining <= 60_000;
  const criticalSpeed = remaining <= 10_000; // últimos 10s, pulso ainda mais rápido

  return (
    <div className={`countdown ${final ? "final" : ""} ${criticalSpeed ? "critical" : ""}`}>
      {final && <span className="suspense-label">🔥 Quase lá…</span>}
      <div className="units">
        <Unit value={days} label="dias" final={final} critical={criticalSpeed} />
        <Unit value={hours} label="horas" final={final} critical={criticalSpeed} />
        <Unit value={minutes} label="min" final={final} critical={criticalSpeed} />
        <Unit value={seconds} label="seg" final={final} critical={criticalSpeed} />
      </div>
      <style jsx>{`
        .countdown {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .units {
          display: flex;
          justify-content: center;
          gap: 0.75rem;
        }
        .suspense-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #f97316;
          animation: labelPulse 1s ease-in-out infinite;
        }
        .countdown.critical .suspense-label {
          animation-duration: 0.4s;
        }
        .soon {
          opacity: 0.8;
        }
        @keyframes labelPulse {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function Unit({
  value,
  label,
  final,
  critical,
}: {
  value: number;
  label: string;
  final: boolean;
  critical: boolean;
}) {
  return (
    <div className={`unit ${final ? "final" : ""} ${critical ? "critical" : ""}`}>
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
          border: 1px solid transparent;
          transition: border-color 0.2s;
        }
        .unit.final {
          animation: unitPulse 1s ease-in-out infinite;
          border-color: rgba(249, 115, 22, 0.5);
        }
        .unit.critical {
          animation-duration: 0.45s;
          border-color: rgba(239, 68, 68, 0.7);
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
        @keyframes unitPulse {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 rgba(249, 115, 22, 0);
          }
          50% {
            transform: scale(1.08);
            box-shadow: 0 0 1rem rgba(249, 115, 22, 0.45);
          }
        }
      `}</style>
    </div>
  );
}
