"use client";

import { useState } from "react";
import { DrawReveal } from "@/components/DrawReveal";
import { Button } from "@/components/ui/primitives";

interface Prize {
  id: string;
  name: string;
  status: "PENDING" | "DRAWN" | "VOIDED";
}

export function PrizeDrawPanel({ prize }: { prize: Prize }) {
  const [state, setState] = useState<
    | { phase: "idle" }
    | { phase: "drawing"; drawResultId: string; winningNumber: number; winnerName: string }
    | { phase: "revealed"; drawResultId: string; winningNumber: number; winnerName: string }
    | { phase: "error"; message: string }
  >({ phase: "idle" });

  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);

  async function runDraw() {
    const res = await fetch(`/api/admin/prizes/${prize.id}/draw`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setState({ phase: "error", message: data.error ?? "Não foi possível sortear." });
      return;
    }
    setState({
      phase: "drawing",
      drawResultId: data.result.id,
      winningNumber: data.result.winningNumber,
      winnerName: data.result.participant.name,
    });
  }

  async function publish() {
    if (state.phase !== "revealed") return;
    setPublishing(true);
    await fetch(`/api/admin/draw-results/${state.drawResultId}/publish`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setPublishing(false);
    setPublished(true);
  }

  if (prize.status === "DRAWN" && state.phase === "idle") {
    return <span className="already">Já sorteado</span>;
  }

  return (
    <div className="panel">
      {state.phase === "idle" && <Button onClick={runDraw}>Sortear agora</Button>}

      {(state.phase === "drawing" || state.phase === "revealed") && (
        <div className="reveal">
          <DrawReveal
            winningNumber={state.winningNumber}
            onSettled={() =>
              setState({
                phase: "revealed",
                drawResultId: state.drawResultId,
                winningNumber: state.winningNumber,
                winnerName: state.winnerName,
              })
            }
          />
          {state.phase === "revealed" && (
            <>
              <p className="winner">
                🎉 <strong>{state.winnerName}</strong> é o vencedor de {prize.name}!
              </p>
              {published ? (
                <p className="published-note">Publicado na página de vencedores.</p>
              ) : (
                <Button variant="ghost" onClick={publish} disabled={publishing}>
                  {publishing ? "Publicando…" : "Publicar resultado"}
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {state.phase === "error" && <p className="error">{state.message}</p>}

      <style jsx>{`
        .already {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .reveal {
          margin-top: 0.75rem;
        }
        .winner {
          margin-top: 1rem;
          font-size: 1rem;
        }
        .published-note {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .error {
          color: #c0392b;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
