"use client";

import { useEffect, useState } from "react";

type MissionType = "SELF_CHECK" | "QUIZ" | "PHOTO_UPLOAD" | "LINK_VISIT";

interface SurpriseData {
  id: string;
  unlockAt: string;
  unlocked: boolean;
  completed: boolean;
  bonusRaffleNumber?: number | null;
  type?: MissionType;
  title?: string | null;
  description?: string | null;
  linkUrl?: string | null;
  quizOptions?: string[] | null;
}

function useCountdown(target: string) {
  const [remaining, setRemaining] = useState(() => new Date(target).getTime() - Date.now());

  useEffect(() => {
    const t = setInterval(() => setRemaining(new Date(target).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);

  const done = remaining <= 0;
  const totalSeconds = Math.max(0, Math.floor(remaining / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { done, days, hours, minutes, seconds };
}

export function SurpriseSection({ mission: initial }: { mission: SurpriseData }) {
  const [mission, setMission] = useState(initial);
  const { done: countdownDone, days, hours, minutes, seconds } = useCountdown(mission.unlockAt);

  useEffect(() => {
    if (countdownDone && !mission.unlocked) {
      window.location.reload();
    }
  }, [countdownDone, mission.unlocked]);

  if (!mission.unlocked) {
    return (
      <section className="surprise locked">
        <span className="badge">🎁 UMA SURPRESA ESTÁ ESPERANDO POR VOCÊ</span>
        <p className="lead">
          Você já garantiu seu Número da Sorte. Mas sua participação ainda pode desbloquear uma
          nova oportunidade.
        </p>
        <div className="countdown">
          <div className="unit">
            <strong>{days}</strong>
            <span>dias</span>
          </div>
          <div className="unit">
            <strong>{String(hours).padStart(2, "0")}</strong>
            <span>h</span>
          </div>
          <div className="unit">
            <strong>{String(minutes).padStart(2, "0")}</strong>
            <span>min</span>
          </div>
          <div className="unit">
            <strong>{String(seconds).padStart(2, "0")}</strong>
            <span>s</span>
          </div>
        </div>
        <p className="fine-print">Essa etapa estará disponível somente para participantes da campanha.</p>

        <style jsx>{`
          .surprise {
            max-width: 30rem;
            margin: 2.5rem auto;
            padding: 2rem 1.75rem;
            border-radius: 1rem;
            text-align: center;
          }
          .surprise.locked {
            background: rgba(255, 255, 255, 0.04);
            border: 1px dashed rgba(255, 255, 255, 0.2);
          }
          .badge {
            display: inline-block;
            font-size: 0.78rem;
            font-weight: 700;
            letter-spacing: 0.03em;
            color: #e8b646;
            margin-bottom: 0.75rem;
          }
          .lead {
            opacity: 0.8;
            line-height: 1.6;
            margin: 0 0 1.5rem;
            font-size: 0.92rem;
          }
          .countdown {
            display: flex;
            justify-content: center;
            gap: 1rem;
            margin-bottom: 1.25rem;
          }
          .unit {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 3rem;
          }
          .unit strong {
            font-family: var(--font-mono, monospace);
            font-size: 1.6rem;
            font-weight: 700;
          }
          .unit span {
            font-size: 0.7rem;
            opacity: 0.6;
            text-transform: uppercase;
          }
          .fine-print {
            font-size: 0.78rem;
            opacity: 0.55;
            margin: 0;
          }
        `}</style>
      </section>
    );
  }

  if (mission.completed || mission.bonusRaffleNumber) {
    return (
      <section className="surprise done">
        <span className="badge unlocked">🎉 VOCÊ DESBLOQUEOU UM NOVO NÚMERO!</span>
        {mission.bonusRaffleNumber && <p className="bonus-number">Número da Sorte 2: #{mission.bonusRaffleNumber}</p>}
        <style jsx>{`
          .surprise {
            max-width: 30rem;
            margin: 2.5rem auto;
            padding: 2rem 1.75rem;
            border-radius: 1rem;
            text-align: center;
          }
          .surprise.done {
            background: rgba(79, 95, 255, 0.1);
            border: 1px solid rgba(79, 95, 255, 0.3);
          }
          .badge.unlocked {
            display: block;
            font-size: 1rem;
            font-weight: 700;
            margin-bottom: 0.75rem;
          }
          .bonus-number {
            font-family: var(--font-mono, monospace);
            font-size: 1.3rem;
            font-weight: 700;
            color: var(--primary, #4f5fff);
            margin: 0;
          }
        `}</style>
      </section>
    );
  }

  return (
    <section className="surprise revealed">
      <span className="badge revealed-badge">🎉 SURPRESA DESBLOQUEADA</span>
      <h3>{mission.title}</h3>
      {mission.description && <p className="lead">{mission.description}</p>}

      <SurpriseAction mission={mission} onDone={(n) => setMission((m) => ({ ...m, completed: true, bonusRaffleNumber: n }))} />

      <style jsx>{`
        .surprise {
          max-width: 30rem;
          margin: 2.5rem auto;
          padding: 2rem 1.75rem;
          border-radius: 1rem;
          text-align: center;
        }
        .surprise.revealed {
          background: rgba(232, 182, 70, 0.08);
          border: 1px solid rgba(232, 182, 70, 0.35);
        }
        .revealed-badge {
          display: inline-block;
          font-size: 0.85rem;
          font-weight: 700;
          color: #e8b646;
          margin-bottom: 0.75rem;
        }
        h3 {
          font-family: "Sora", system-ui, sans-serif;
          margin: 0 0 0.6rem;
        }
        .lead {
          opacity: 0.75;
          line-height: 1.6;
          margin: 0 0 1.25rem;
          font-size: 0.9rem;
        }
      `}</style>
    </section>
  );
}

function SurpriseAction({
  mission,
  onDone,
}: {
  mission: SurpriseData;
  onDone: (bonusNumber: number | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function complete(body: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/public/missions/${mission.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Não foi possível registrar. Tente de novo.");
      return;
    }
    if (mission.type === "QUIZ" && data.correct === false) {
      setError("Resposta errada, tenta de novo!");
      return;
    }
    onDone(data.bonusRaffleNumber ?? null);
  }

  async function handleUpload(f: File) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", f);
    try {
      const res = await fetch("/api/public/upload", { method: "POST", body: form });
      const data = await res.json();
      setUploading(false);
      if (!res.ok) {
        setError(data.error ?? "Não foi possível enviar a foto.");
        return;
      }
      await complete({ photoUrl: data.url });
    } catch {
      setUploading(false);
      setError("Não foi possível enviar a foto.");
    }
  }

  return (
    <div className="action">
      {(mission.type === "SELF_CHECK" || mission.type === "LINK_VISIT") && (
        <>
          {mission.linkUrl && (
            <a href={mission.linkUrl} target="_blank" rel="noopener noreferrer" className="link-btn">
              Abrir link ↗
            </a>
          )}
          <button className="confirm-btn" onClick={() => complete()} disabled={busy}>
            {busy ? "…" : "Já fiz! ✅"}
          </button>
        </>
      )}

      {mission.type === "QUIZ" && mission.quizOptions && (
        <div className="quiz">
          <div className="options">
            {mission.quizOptions.map((opt, i) => (
              <label key={i} className={`option ${selected === i ? "selected" : ""}`}>
                <input type="radio" name="surprise-quiz" checked={selected === i} onChange={() => setSelected(i)} />
                {opt}
              </label>
            ))}
          </div>
          <button
            className="confirm-btn"
            onClick={() => selected !== null && complete({ answerIndex: selected })}
            disabled={selected === null || busy}
          >
            {busy ? "…" : "Confirmar resposta"}
          </button>
        </div>
      )}

      {mission.type === "PHOTO_UPLOAD" && (
        <label className="photo-input">
          {uploading || busy ? "Enviando…" : file ? `📎 ${file.name}` : "📷 Escolher foto"}
          <input
            type="file"
            accept="image/*"
            disabled={uploading || busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFile(f);
                handleUpload(f);
              }
            }}
          />
        </label>
      )}

      {error && <p className="error">{error}</p>}

      <style jsx>{`
        .action {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }
        .link-btn {
          color: #e8b646;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
          border: 1px solid rgba(232, 182, 70, 0.4);
          border-radius: 999px;
          padding: 0.45rem 0.9rem;
        }
        .confirm-btn,
        .photo-input {
          background: #e8b646;
          color: #12121a;
          border: none;
          border-radius: 999px;
          padding: 0.6rem 1.3rem;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
        }
        .confirm-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .photo-input input {
          display: none;
        }
        .quiz {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          align-items: center;
        }
        .options {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          width: 100%;
          max-width: 20rem;
        }
        .option {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          padding: 0.45rem 0.6rem;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 0.5rem;
          cursor: pointer;
          text-align: left;
        }
        .option.selected {
          border-color: #e8b646;
          background: rgba(232, 182, 70, 0.1);
        }
        .error {
          font-size: 0.8rem;
          color: #fca5a5;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
