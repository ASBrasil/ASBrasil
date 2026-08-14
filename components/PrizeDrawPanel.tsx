"use client";

import { useEffect, useState } from "react";
import { DrawReveal } from "@/components/DrawReveal";
import { Button } from "@/components/ui/primitives";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface Prize {
  id: string;
  name: string;
  status: "PENDING" | "DRAWN" | "VOIDED";
}

interface ExistingResult {
  drawResultId: string;
  winningNumber: number;
  winnerName: string;
  published: boolean;
  winnerPhotoUrl: string | null;
}

export function PrizeDrawPanel({ prize }: { prize: Prize }) {
  const [state, setState] = useState<
    | { phase: "idle" }
    | { phase: "loading" }
    | { phase: "drawing"; drawResultId: string; winningNumber: number; winnerName: string }
    | { phase: "revealed"; result: ExistingResult }
    | { phase: "error"; message: string }
  >(prize.status === "DRAWN" ? { phase: "loading" } : { phase: "idle" });

  const [publishing, setPublishing] = useState(false);

  // The draw itself only lives in memory during the live reveal animation -
  // once the admin leaves and comes back, we need to re-fetch whatever
  // result already exists so "Publicar resultado" doesn't just vanish
  // forever the moment the page is refreshed.
  useEffect(() => {
    if (prize.status !== "DRAWN") return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/prizes/${prize.id}`);
      const data = await res.json();
      if (cancelled) return;
      const current = data.prize?.drawResults?.[0];
      if (current) {
        setState({
          phase: "revealed",
          result: {
            drawResultId: current.id,
            winningNumber: current.winningNumber,
            winnerName: current.participant.name,
            published: !!current.publishedAt,
            winnerPhotoUrl: current.winnerPhotoUrl,
          },
        });
      } else {
        setState({ phase: "idle" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [prize.id, prize.status]);

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

  async function setPublished(published: boolean, winnerPhotoUrl?: string | null) {
    if (state.phase !== "revealed") return;
    setPublishing(true);
    await fetch(`/api/admin/draw-results/${state.result.drawResultId}/publish`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        published,
        ...(winnerPhotoUrl !== undefined ? { winnerPhotoUrl } : {}),
      }),
    });
    setPublishing(false);
    setState((s) =>
      s.phase === "revealed"
        ? {
            phase: "revealed",
            result: {
              ...s.result,
              published,
              winnerPhotoUrl: winnerPhotoUrl !== undefined ? winnerPhotoUrl : s.result.winnerPhotoUrl,
            },
          }
        : s
    );
  }

  if (state.phase === "loading") {
    return <span className="already">Carregando…</span>;
  }

  return (
    <div className="panel">
      {state.phase === "idle" && <Button onClick={runDraw}>Sortear agora</Button>}

      {state.phase === "drawing" && (
        <div className="reveal">
          <DrawReveal
            winningNumber={state.winningNumber}
            onSettled={() =>
              setState({
                phase: "revealed",
                result: {
                  drawResultId: state.drawResultId,
                  winningNumber: state.winningNumber,
                  winnerName: state.winnerName,
                  published: false,
                  winnerPhotoUrl: null,
                },
              })
            }
          />
        </div>
      )}

      {state.phase === "revealed" && (
        <div className="reveal">
          <p className="winner">
            🎉 <strong>{state.result.winnerName}</strong> é o vencedor de {prize.name}! (nº{" "}
            {state.result.winningNumber})
          </p>

          <ImageUpload
            label="Foto do vencedor"
            hint="Opcional. Aparece na página pública de vencedores."
            value={state.result.winnerPhotoUrl}
            onChange={(url) => setPublished(state.result.published, url)}
            folder="winner-photos"
            aspectRatio="4 / 3"
          />

          {state.result.published ? (
            <>
              <p className="published-note">✅ Publicado na página de vencedores.</p>
              <Button variant="ghost" onClick={() => setPublished(false)} disabled={publishing}>
                {publishing ? "…" : "Despublicar"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setPublished(true)} disabled={publishing}>
              {publishing ? "Publicando…" : "Publicar resultado"}
            </Button>
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
          max-width: 20rem;
        }
        .winner {
          margin: 1rem 0;
          font-size: 1rem;
        }
        .published-note {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }
        .error {
          color: #c0392b;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
