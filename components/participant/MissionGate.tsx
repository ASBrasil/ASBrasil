"use client";

import { useState } from "react";

type MissionType = "SELF_CHECK" | "QUIZ" | "PHOTO_UPLOAD" | "LINK_VISIT";

interface MissionItem {
  id: string;
  type: MissionType;
  title: string;
  description: string | null;
  required: boolean;
  linkUrl: string | null;
  quizOptions: string[] | null;
  completed: boolean;
}

export function MissionGate({ missions }: { missions: MissionItem[] }) {
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(missions.map((m) => [m.id, m.completed]))
  );

  const pendingRequired = missions.filter((m) => m.required && !state[m.id]);
  const allDone = pendingRequired.length === 0;

  function markDone(id: string) {
    setState((s) => ({ ...s, [id]: true }));
  }

  return (
    <section className="gate">
      <div className="intro">
        <span className="badge">🎯 Pré-requisitos</span>
        <h2>Antes de ver seus números...</h2>
        <p>Complete as missões abaixo para desbloquear seus números e resultados neste evento.</p>
      </div>

      <div className="list">
        {missions.map((m) => (
          <MissionCard key={m.id} mission={m} done={state[m.id]} onDone={() => markDone(m.id)} />
        ))}
      </div>

      {allDone ? (
        <button className="continue-btn" onClick={() => window.location.reload()}>
          Tudo pronto! Ver meus números →
        </button>
      ) : (
        <p className="remaining">
          Faltam {pendingRequired.length} {pendingRequired.length === 1 ? "missão obrigatória" : "missões obrigatórias"}.
        </p>
      )}

      <style jsx>{`
        .gate {
          max-width: 34rem;
          margin: 0 auto;
          padding: 2.5rem 1.5rem 5rem;
        }
        .intro {
          text-align: center;
          margin-bottom: 2rem;
        }
        .badge {
          display: inline-block;
          background: rgba(79, 95, 255, 0.15);
          color: #8b9aff;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          margin-bottom: 0.75rem;
        }
        .intro h2 {
          font-family: "Sora", system-ui, sans-serif;
          margin: 0 0 0.5rem;
          font-size: 1.4rem;
        }
        .intro p {
          opacity: 0.7;
          margin: 0;
          font-size: 0.92rem;
        }
        .list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          margin-bottom: 1.5rem;
        }
        .continue-btn {
          display: block;
          width: 100%;
          background: var(--primary, #4f5fff);
          color: #12121a;
          border: none;
          border-radius: 999px;
          padding: 0.9rem;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
        }
        .remaining {
          text-align: center;
          font-size: 0.85rem;
          opacity: 0.6;
          margin: 0;
        }
      `}</style>
    </section>
  );
}

function MissionCard({
  mission,
  done,
  onDone,
}: {
  mission: MissionItem;
  done: boolean;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    onDone();
  }

  return (
    <div className={`card ${done ? "done" : ""}`}>
      <div className="head">
        <span className="check">{done ? "✅" : mission.required ? "🔒" : "⭐"}</span>
        <div>
          <strong>{mission.title}</strong>
          {mission.description && <p className="desc">{mission.description}</p>}
          {!mission.required && <span className="optional-tag">Opcional</span>}
        </div>
      </div>

      {!done && (
        <div className="body">
          {(mission.type === "SELF_CHECK" || mission.type === "LINK_VISIT") && (
            <>
              {mission.linkUrl && (
                <a href={mission.linkUrl} target="_blank" rel="noopener noreferrer" className="link-btn">
                  {mission.type === "LINK_VISIT" ? "Abrir link ↗" : "Ir ao link ↗"}
                </a>
              )}
              <button className="confirm-btn" onClick={() => complete()} disabled={busy}>
                {busy ? "…" : "Já fiz! ✅"}
              </button>
            </>
          )}

          {mission.type === "QUIZ" && mission.quizOptions && (
            <QuizForm options={mission.quizOptions} busy={busy} onAnswer={(i) => complete({ answerIndex: i })} />
          )}

          {mission.type === "PHOTO_UPLOAD" && (
            <PhotoUploadForm busy={busy} onUploaded={(url) => complete({ photoUrl: url })} />
          )}

          {error && <p className="error">{error}</p>}
        </div>
      )}

      <style jsx>{`
        .card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.85rem;
          padding: 1rem 1.1rem;
        }
        .card.done {
          opacity: 0.6;
        }
        .head {
          display: flex;
          gap: 0.65rem;
          align-items: flex-start;
        }
        .check {
          font-size: 1.1rem;
          flex-shrink: 0;
        }
        .desc {
          margin: 0.2rem 0 0;
          font-size: 0.85rem;
          opacity: 0.65;
        }
        .optional-tag {
          display: inline-block;
          margin-top: 0.35rem;
          font-size: 0.68rem;
          color: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 999px;
          padding: 0.1rem 0.5rem;
        }
        .body {
          margin-top: 0.85rem;
          padding-top: 0.85rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          align-items: center;
        }
        .link-btn {
          color: #8b9aff;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
          border: 1px solid rgba(139, 154, 255, 0.4);
          border-radius: 999px;
          padding: 0.45rem 0.9rem;
        }
        .confirm-btn {
          background: var(--primary, #4f5fff);
          color: #12121a;
          border: none;
          border-radius: 999px;
          padding: 0.45rem 1rem;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .confirm-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .error {
          width: 100%;
          font-size: 0.8rem;
          color: #fca5a5;
          margin: 0;
        }
      `}</style>
    </div>
  );
}

function QuizForm({
  options,
  busy,
  onAnswer,
}: {
  options: string[];
  busy: boolean;
  onAnswer: (index: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="quiz">
      <div className="options">
        {options.map((opt, i) => (
          <label key={i} className={`option ${selected === i ? "selected" : ""}`}>
            <input type="radio" name="quiz" checked={selected === i} onChange={() => setSelected(i)} />
            {opt}
          </label>
        ))}
      </div>
      <button
        className="confirm-btn"
        onClick={() => selected !== null && onAnswer(selected)}
        disabled={selected === null || busy}
      >
        {busy ? "…" : "Confirmar resposta"}
      </button>

      <style jsx>{`
        .quiz {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .options {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
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
        }
        .option.selected {
          border-color: var(--primary, #4f5fff);
          background: rgba(79, 95, 255, 0.1);
        }
        .confirm-btn {
          align-self: flex-start;
          background: var(--primary, #4f5fff);
          color: #12121a;
          border: none;
          border-radius: 999px;
          padding: 0.45rem 1rem;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .confirm-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }
      `}</style>
    </div>
  );
}

function PhotoUploadForm({
  busy,
  onUploaded,
}: {
  busy: boolean;
  onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/public/upload", { method: "POST", body: form });
      const data = await res.json();
      setUploading(false);
      if (!res.ok) {
        setError(data.error ?? "Não foi possível enviar a foto.");
        return;
      }
      onUploaded(data.url);
    } catch {
      setUploading(false);
      setError("Não foi possível enviar a foto.");
    }
  }

  return (
    <div className="upload">
      <label className="upload-btn">
        {uploading || busy ? "Enviando…" : "📷 Escolher foto"}
        <input
          type="file"
          accept="image/*"
          disabled={uploading || busy}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </label>
      {error && <p className="error">{error}</p>}

      <style jsx>{`
        .upload {
          width: 100%;
        }
        .upload-btn {
          display: inline-block;
          background: var(--primary, #4f5fff);
          color: #12121a;
          border-radius: 999px;
          padding: 0.45rem 1rem;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .upload-btn input {
          display: none;
        }
        .error {
          font-size: 0.8rem;
          color: #fca5a5;
          margin: 0.5rem 0 0;
        }
      `}</style>
    </div>
  );
}
