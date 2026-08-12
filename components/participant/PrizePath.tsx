import Link from "next/link";

export interface PathStep {
  id: string;
  name: string;
  order: number;
  state: "completed" | "current" | "locked";
  won: boolean; // only meaningful when state === "completed"
}

/**
 * Visual states, matching what was asked for: steps default to a dim
 * ("apagado") look, and only the current/next actionable draw is lit
 * ("aceso"). Completed draws get their own muted-but-marked look so it's
 * clear they've already happened. Every step is still a real link -
 * dim doesn't mean disabled, it's just not the one asking for attention.
 *
 * Each node is a plain circle with an emoji placeholder for now - swap the
 * `iconFor()` output for real per-prize artwork once that's ready.
 */
export function PrizePath({ slug, steps }: { slug: string; steps: PathStep[] }) {
  return (
    <div className="path">
      {steps.map((step, i) => (
        <div className="step-wrap" key={step.id}>
          <Link href={`/e/${slug}/painel/premio/${step.id}`} className={`node ${step.state}`}>
            <span className="icon">{iconFor(step)}</span>
          </Link>
          <span className="label">{step.name}</span>
          {i < steps.length - 1 && <span className={`connector ${step.state === "completed" ? "done" : ""}`} />}
        </div>
      ))}

      <style>{`
        .path {
          display: flex;
          align-items: flex-start;
          gap: 0;
          overflow-x: auto;
          padding: 1.5rem 0.5rem;
        }
        .step-wrap {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .step-wrap:last-child .label-col {
          margin-right: 0;
        }
        .node {
          width: 3.75rem;
          height: 3.75rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          text-decoration: none;
          flex-shrink: 0;
          position: relative;
        }
        .node.locked {
          background: rgba(255, 255, 255, 0.06);
          border: 2px dashed rgba(255, 255, 255, 0.15);
          opacity: 0.55;
        }
        .node.current {
          background: var(--primary, #4f5fff);
          box-shadow: 0 0 0 6px color-mix(in srgb, var(--primary, #4f5fff) 25%, transparent);
        }
        .node.completed {
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid var(--primary, #4f5fff);
        }
        .label {
          position: absolute;
          margin-top: 4.4rem;
          font-size: 0.72rem;
          text-align: center;
          width: 5rem;
          margin-left: -0.65rem;
          opacity: 0.75;
        }
        .connector {
          width: 2.5rem;
          height: 2px;
          background: rgba(255, 255, 255, 0.15);
          flex-shrink: 0;
        }
        .connector.done {
          background: var(--primary, #4f5fff);
        }
      `}</style>
    </div>
  );
}

function iconFor(step: PathStep) {
  if (step.state === "completed") return step.won ? "🏆" : "✔️";
  if (step.state === "current") return "🎁";
  return "🔒";
}
