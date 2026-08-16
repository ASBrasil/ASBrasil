"use client";

import { useEffect, useState } from "react";
import { Countdown } from "./Countdown";
import { DrawReveal } from "@/components/DrawReveal";
import { Fireworks } from "./Fireworks";
import { playRevealWin, playRevealLose } from "@/lib/drawSound";

interface Result {
  winningNumber: number;
  winnerName: string;
}

export function PrizeResultLive({
  prizeId,
  initialResult,
  scheduledAt,
  raffleNumbers,
  won: initialWon,
  winMessage,
  loseMessage,
  couponCode,
}: {
  prizeId: string;
  initialResult: Result | null;
  scheduledAt: string | null;
  raffleNumbers: number[];
  won: boolean;
  winMessage?: string | null;
  loseMessage?: string | null;
  couponCode?: string | null;
}) {
  // "waiting"  -> ainda não saiu resultado nenhum, mostra contagem/número
  // "drawing"  -> resultado já saiu no servidor, mas ainda estamos girando os dígitos
  // "revealed" -> girou e travou, mostra o vencedor de verdade
  const [phase, setPhase] = useState<"waiting" | "drawing" | "revealed">(
    initialResult ? "revealed" : "waiting"
  );
  const [result, setResult] = useState<Result | null>(initialResult);
  const [won, setWon] = useState(initialWon);
  // Só dispara na virada ao vivo (drawing -> revealed), nunca em quem só
  // chega na página já sabendo o resultado - senão os fogos "explodiriam"
  // de novo a cada F5, o que enjoa rápido.
  const [showFireworks, setShowFireworks] = useState(false);

  useEffect(() => {
    if (phase !== "waiting") return; // já sabemos o resultado, não precisa mais perguntar

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/prizes/${prizeId}/result`);
        const data = await res.json();
        if (data.result) {
          setResult(data.result);
          setWon(raffleNumbers.includes(data.result.winningNumber));
          setPhase("drawing"); // começa a girar em vez de revelar na hora
        }
      } catch {
        // silenciosamente tenta de novo no próximo intervalo
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [phase, prizeId, raffleNumbers]);

  if (phase === "drawing" && result) {
    return (
      <div className="drawing">
        <span className="tag pulse">Sorteando…</span>
        <DrawReveal
          winningNumber={result.winningNumber}
          onSettled={() => {
            setPhase("revealed");
            if (won) {
              playRevealWin();
              setShowFireworks(true);
              setTimeout(() => setShowFireworks(false), 2500);
            } else {
              playRevealLose();
            }
          }}
        />
        <style jsx>{`
          .drawing {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          }
          .tag {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--primary, #4f5fff);
          }
          .pulse {
            animation: pulse 1s ease-in-out infinite;
          }
          @keyframes pulse {
            0%,
            100% {
              opacity: 0.5;
            }
            50% {
              opacity: 1;
            }
          }
        `}</style>
      </div>
    );
  }

  if (phase === "revealed" && result) {
    return (
      <div className="result">
        {showFireworks && <Fireworks />}
        <span className="tag">Resultado</span>
        {won ? (
          <>
            <p className="big">{winMessage || "🎉 Parabéns, você ganhou!"}</p>
            <p className="detail">Número sorteado: {result.winningNumber}</p>
            {couponCode && (
              <div className="coupon">
                <span className="coupon-label">Seu cupom</span>
                <span className="coupon-code">{couponCode}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="big">{loseMessage || "Dessa vez não foi você."}</p>
            <p className="detail">
              Vencedor(a): {result.winnerName} · Número {result.winningNumber}
            </p>
          </>
        )}
        <style jsx>{`
          .tag {
            display: inline-block;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--primary, #4f5fff);
            margin-bottom: 1rem;
          }
          .big {
            font-size: 1.3rem;
            margin: 0.3rem 0;
          }
          .detail {
            opacity: 0.7;
            font-size: 0.9rem;
          }
          .coupon {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            gap: 0.2rem;
            margin-top: 1.25rem;
            padding: 0.85rem 1.5rem;
            border-radius: 0.75rem;
            border: 1.5px dashed var(--primary, #4f5fff);
            background: color-mix(in srgb, var(--primary, #4f5fff) 12%, transparent);
          }
          .coupon-label {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            opacity: 0.75;
          }
          .coupon-code {
            font-family: monospace;
            font-size: 1.2rem;
            font-weight: 700;
            letter-spacing: 0.04em;
            color: var(--primary, #4f5fff);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="pending">
      <span className="status-badge">🕐 Ainda não sorteado</span>

      <div className="countdown-card">
        {scheduledAt ? (
          <>
            <span className="countdown-label">Sorteio em</span>
            <Countdown target={scheduledAt} />
          </>
        ) : (
          <p className="detail">Data do sorteio ainda não definida.</p>
        )}
      </div>

      <div className="number-pill">
        {raffleNumbers.length === 1 ? (
          <>
            Seu número é: <strong>{raffleNumbers[0]}</strong>
          </>
        ) : (
          <>
            Seus números: <strong>{raffleNumbers.join(" · ")}</strong>
          </>
        )}
      </div>
      <style jsx>{`
        .pending {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--primary, #4f5fff);
          background: color-mix(in srgb, var(--primary, #4f5fff) 14%, transparent);
          border-radius: 999px;
          padding: 0.35rem 0.85rem;
          margin-bottom: 1.25rem;
        }
        .countdown-card {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 1rem;
          padding: 1.25rem 1rem;
          margin-bottom: 1rem;
        }
        .countdown-label {
          display: block;
          text-align: center;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          opacity: 0.55;
          margin-bottom: 0.75rem;
        }
        .detail {
          opacity: 0.7;
          font-size: 0.9rem;
          margin: 0;
          text-align: center;
        }
        .number-pill {
          display: inline-block;
          max-width: 28rem;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 1.5rem;
          padding: 0.6rem 1.4rem;
          font-size: 0.9rem;
          line-height: 1.6;
          margin-top: 0.25rem;
        }
        .number-pill strong {
          font-family: monospace;
          color: var(--primary, #4f5fff);
          font-size: 1.1rem;
          margin-left: 0.3rem;
        }
      `}</style>
    </div>
  );
}