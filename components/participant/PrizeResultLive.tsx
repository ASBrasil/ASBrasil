"use client";

import { useEffect, useState } from "react";
import { Countdown } from "./Countdown";

interface Result {
  winningNumber: number;
  winnerName: string;
}

export function PrizeResultLive({
  prizeId,
  initialResult,
  scheduledAt,
  raffleNumber,
  won: initialWon,
}: {
  prizeId: string;
  initialResult: Result | null;
  scheduledAt: string | null;
  raffleNumber: number;
  won: boolean;
}) {
  const [result, setResult] = useState<Result | null>(initialResult);
  const [won, setWon] = useState(initialWon);

  useEffect(() => {
    if (result) return; // já temos resultado, não precisa perguntar de novo

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/prizes/${prizeId}/result`);
        const data = await res.json();
        if (data.result) {
          setResult(data.result);
          setWon(data.result.winningNumber === raffleNumber);
        }
      } catch {
        // silenciosamente tenta de novo no próximo intervalo
      }
    }, 4000); // pergunta a cada 4 segundos

    return () => clearInterval(interval);
  }, [result, prizeId, raffleNumber]);

  if (result) {
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
        Seu número é: <strong>{raffleNumber}</strong>
      </div>
    </div>
  );
}