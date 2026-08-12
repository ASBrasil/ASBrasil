export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="stepper">
      <div className="track">
        {steps.map((_, i) => (
          <div key={i} className={`segment ${i <= current ? "done" : ""}`} />
        ))}
      </div>
      <div className="labels">
        {steps.map((label, i) => (
          <span key={label} className={i === current ? "active" : i < current ? "past" : ""}>
            {label}
          </span>
        ))}
      </div>
      <style jsx>{`
        .stepper {
          width: 100%;
        }
        .track {
          display: flex;
          gap: 0.35rem;
          margin-bottom: 0.6rem;
        }
        .segment {
          flex: 1;
          height: 3px;
          border-radius: 2px;
          background: var(--step-inactive);
        }
        .segment.done {
          background: var(--indigo-600);
        }
        .labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
        }
        .labels span {
          color: var(--text-muted);
        }
        .labels .active {
          color: var(--indigo-600);
          font-weight: 600;
        }
        .labels .past {
          color: var(--text);
        }
      `}</style>
    </div>
  );
}
