"use client";

import { useEffect, useState } from "react";

type MissionType = "SELF_CHECK" | "QUIZ" | "PHOTO_UPLOAD" | "LINK_VISIT";

export interface MissionOpportunity {
  id: string;
  unlockAt: string | null;
  unlocked: boolean;
  type?: MissionType;
  title?: string | null;
  description?: string | null;
  linkUrl?: string | null;
  quizOptions?: string[] | null;
}

function useCountdown(target: string | null) {
  const [remaining, setRemaining] = useState(() => (target ? new Date(target).getTime() - Date.now() : 0));

  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setRemaining(new Date(target).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);

  const done = remaining <= 0;
  const totalSeconds = Math.max(0, Math.floor(remaining / 1000));
  return {
    done,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

const cardBase: React.CSSProperties = {
  padding: "1.75rem 1.5rem",
  borderRadius: "1.1rem",
  textAlign: "center",
};

/**
 * mode="first": ainda não tem nenhum número - completar QUALQUER uma
 * dessas revela o primeiro número da sorte (escondido até então).
 * mode="bonus": já tem pelo menos um número - completar mais uma dessas
 * gera um número EXTRA, adicional.
 */
export function MissionOpportunities({
  missions,
  mode,
}: {
  missions: MissionOpportunity[];
  mode: "first" | "bonus";
}) {
  if (missions.length === 0) return null;

  return (
    <section style={{ maxWidth: "30rem", margin: "2.5rem auto", padding: "0 1.5rem" }}>
      <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
        <span
          style={{
            display: "inline-block",
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "#e8b646",
          }}
        >
          {mode === "first" ? "Escolha um pré-requisito" : "Ganhe mais números"}
        </span>
        <p style={{ margin: "0.5rem 0 0", opacity: 0.75, fontSize: "0.88rem", lineHeight: 1.6 }}>
          {mode === "first"
            ? "Complete qualquer uma das opções abaixo pra garantir seu Número da Sorte."
            : "Complete mais alguma das opções abaixo e garanta um Número da Sorte a mais - adicional, não substitui os que você já tem."}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {missions.map((m) => (
          <MissionCard key={m.id} mission={m} />
        ))}
      </div>
    </section>
  );
}

function MissionCard({ mission: initial }: { mission: MissionOpportunity }) {
  const [mission] = useState(initial);
  const [done, setDone] = useState(false);
  const [grantedNumber, setGrantedNumber] = useState<number | null>(null);
  const [grantedPending, setGrantedPending] = useState(false);
  const { done: countdownDone, days, hours, minutes, seconds } = useCountdown(
    mission.unlocked ? null : mission.unlockAt
  );

  useEffect(() => {
    if (countdownDone && !mission.unlocked) window.location.reload();
  }, [countdownDone, mission.unlocked]);

  if (!mission.unlocked) {
    return (
      <div style={{ ...cardBase, background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.2)" }}>
        <span style={{ fontSize: "1.3rem" }}>🔒</span>
        <p style={{ margin: "0.5rem 0 0.85rem", fontSize: "0.85rem", opacity: 0.75 }}>
          Uma opção será liberada em breve
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
          {[
            { value: days, label: "dias" },
            { value: String(hours).padStart(2, "0"), label: "h" },
            { value: String(minutes).padStart(2, "0"), label: "min" },
            { value: String(seconds).padStart(2, "0"), label: "s" },
          ].map((u, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "2.4rem" }}>
              <strong style={{ fontFamily: "monospace", fontSize: "1.15rem" }}>{u.value}</strong>
              <span style={{ fontSize: "0.62rem", opacity: 0.6, textTransform: "uppercase" }}>{u.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ ...cardBase, background: "rgba(79,95,255,0.1)", border: "1px solid rgba(79,95,255,0.3)" }}>
        <span style={{ display: "block", fontWeight: 700, marginBottom: "0.4rem" }}>
          {grantedPending ? "⏳ Em análise" : "🎉 Concluído!"}
        </span>
        {grantedNumber !== null && (
          <p style={{ margin: 0, fontFamily: "monospace", fontWeight: 700, fontSize: "1.15rem", color: "var(--primary, #4f5fff)" }}>
            #{grantedNumber}
          </p>
        )}
        {grantedPending && (
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", opacity: 0.65 }}>
            Só entra no sorteio depois que a equipe confirmar.
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ ...cardBase, background: "rgba(232,182,70,0.08)", border: "1px solid rgba(232,182,70,0.35)" }}>
      <h3 style={{ margin: "0 0 0.5rem", fontFamily: "Sora, system-ui, sans-serif", fontSize: "1.05rem" }}>
        {mission.title}
      </h3>
      {mission.description && (
        <p style={{ margin: "0 0 1.1rem", opacity: 0.75, fontSize: "0.87rem", lineHeight: 1.6 }}>
          {mission.description}
        </p>
      )}
      <MissionAction
        mission={mission}
        onDone={(number, pending) => {
          setGrantedNumber(number);
          setGrantedPending(pending);
          setDone(true);
        }}
      />
    </div>
  );
}

function MissionAction({
  mission,
  onDone,
}: {
  mission: MissionOpportunity;
  onDone: (number: number | null, pending: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [linkVisited, setLinkVisited] = useState(false);

  async function complete(body: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/public/missions/${mission.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok || !data) {
      setError(data?.error ?? "Não foi possível registrar. Tente de novo.");
      return;
    }
    if (mission.type === "QUIZ" && data.correct === false) {
      setError("Resposta errada, tenta de novo!");
      return;
    }
    const number = data.revealedRaffleNumber ?? data.bonusRaffleNumber ?? null;
    onDone(number, !!data.pending);
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

  const confirmBtnStyle: React.CSSProperties = {
    background: "#e8b646",
    color: "#12121a",
    border: "none",
    borderRadius: "999px",
    padding: "0.6rem 1.3rem",
    fontWeight: 700,
    fontSize: "0.86rem",
    cursor: "pointer",
  };
  const linkBtnStyle: React.CSSProperties = {
    display: "inline-block",
    color: "#e8b646",
    fontSize: "0.83rem",
    fontWeight: 600,
    textDecoration: "none",
    border: "1px solid rgba(232,182,70,0.4)",
    borderRadius: "999px",
    padding: "0.42rem 0.85rem",
    marginRight: "0.5rem",
  };

  const needsLinkFirst = mission.type === "PHOTO_UPLOAD" && !!mission.linkUrl && !linkVisited;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.65rem" }}>
      {(mission.type === "SELF_CHECK" || mission.type === "LINK_VISIT") && (
        <>
          {mission.linkUrl && (
            <a href={mission.linkUrl} target="_blank" rel="noopener noreferrer" style={linkBtnStyle}>
              Abrir link ↗
            </a>
          )}
          <button style={{ ...confirmBtnStyle, opacity: busy ? 0.6 : 1 }} onClick={() => complete()} disabled={busy}>
            {busy ? "…" : "Já fiz! ✅"}
          </button>
        </>
      )}

      {mission.type === "QUIZ" && mission.quizOptions && (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", width: "100%" }}>
            {mission.quizOptions.map((opt, i) => (
              <label
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.83rem",
                  padding: "0.4rem 0.55rem",
                  border: `1px solid ${selected === i ? "#e8b646" : "rgba(255,255,255,0.15)"}`,
                  background: selected === i ? "rgba(232,182,70,0.1)" : "transparent",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <input type="radio" name={`quiz-${mission.id}`} checked={selected === i} onChange={() => setSelected(i)} />
                {opt}
              </label>
            ))}
          </div>
          <button
            style={{ ...confirmBtnStyle, opacity: selected === null || busy ? 0.6 : 1 }}
            onClick={() => selected !== null && complete({ answerIndex: selected })}
            disabled={selected === null || busy}
          >
            {busy ? "…" : "Confirmar resposta"}
          </button>
        </div>
      )}

      {mission.type === "PHOTO_UPLOAD" && (
        <>
          {mission.linkUrl && (
            <a
              href={mission.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={linkBtnStyle}
              onClick={() => setLinkVisited(true)}
            >
              {linkVisited ? "Abrir link de novo ↗" : "1. Abrir link ↗"}
            </a>
          )}
          {needsLinkFirst && (
            <p style={{ fontSize: "0.76rem", opacity: 0.55, margin: 0 }}>Depois volte aqui pra enviar a foto.</p>
          )}
          {!needsLinkFirst && (
            <label
              style={{
                display: "inline-block",
                background: "#e8b646",
                color: "#12121a",
                borderRadius: "999px",
                padding: "0.6rem 1.3rem",
                fontWeight: 700,
                fontSize: "0.86rem",
                cursor: uploading || busy ? "default" : "pointer",
                opacity: uploading || busy ? 0.7 : 1,
              }}
            >
              {uploading || busy ? "Enviando…" : file ? `📎 ${file.name}` : mission.linkUrl ? "2. Escolher foto 📷" : "Escolher foto 📷"}
              <input
                type="file"
                accept="image/*"
                disabled={uploading || busy}
                style={{ display: "none" }}
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
        </>
      )}

      {error && <p style={{ width: "100%", fontSize: "0.78rem", color: "#fca5a5", margin: 0 }}>{error}</p>}
    </div>
  );
}
