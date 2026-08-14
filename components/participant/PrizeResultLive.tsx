"use client";

import { useEffect, useState } from "react";
import { Countdown } from "./Countdown";
import { DrawReveal } from "@/components/DrawReveal";

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
}: {
  prizeId: string;
  initialResult: Result | null;
  scheduledAt: string | null;
  raffleNumbers: number[];
  won: boolean;
}) {
  // "waiting"  -> ainda não saiu resultado nenhum, mostra contagem/número
  // "drawing"  -> resultado já saiu no servidor, mas ainda estamos girando os dígitos
  // "revealed" -> girou e travou, mostra o vencedor de verdade
  const [phase, setPhase] = useState<"waiting" | "drawing" | "revealed">(
    initialResult ? "revealed" : "waiting"
  );
  const [result, setResult] = useState<Result | null>(initialResult);
  const [won, setWon] = useState(initialWon);

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
          onSettled={() => setPhase("revealed")}
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
        <span className="tag">Resultado</span>
        {won ? (
          <>
            <p className="big">🎉 Parabéns, você ganhou!</p>
            <p className="detail">Número sorteado: {result.winningNumber}</p>
          </>
        ) : (
          <>
            <p className="big">Dessa vez não foi você.</p>
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
        `}</style>
      </div>
    );
  }

  return (
    <div className="pending">
      <span className="tag">Ainda não sorteado</span>
      {scheduledAt ? (
        <Countdown target={scheduledAt} />
      ) : (
        <p className="detail">Data do sorteio ainda não definida.</p>
      )}
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
        .tag {
          display: inline-block;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--primary, #4f5fff);
          margin-bottom: 1rem;
        }
        .detail {
          opacity: 0.7;
          font-size: 0.9rem;
        }
        .number-pill {
          display: inline-block;
          max-width: 28rem;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 1.5rem;
          padding: 0.6rem 1.4rem;
          font-size: 0.9rem;
          line-height: 1.6;
          margin-top: 0.5rem;
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