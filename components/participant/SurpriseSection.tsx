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
  return {
    done,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

const cardBase: React.CSSProperties = {
  maxWidth: "30rem",
  margin: "2.5rem auto",
  padding: "2.25rem 1.75rem",
  borderRadius: "1.25rem",
  textAlign: "center",
};

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
      <section
        style={{
          ...cardBase,
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px dashed rgba(232, 182, 70, 0.35)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            fontSize: "0.78rem",
            fontWeight: 700,
            letterSpacing: "0.03em",
            color: "#e8b646",
            marginBottom: "0.85rem",
          }}
        >
          🎁 UMA SURPRESA ESTÁ ESPERANDO POR VOCÊ
        </span>
        <p style={{ opacity: 0.8, lineHeight: 1.6, margin: "0 0 1.5rem", fontSize: "0.92rem" }}>
          Você já garantiu seu Número da Sorte. Mas sua participação ainda pode desbloquear uma
          nova oportunidade.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "1.25rem" }}>
          {[
            { value: days, label: "dias" },
            { value: String(hours).padStart(2, "0"), label: "h" },
            { value: String(minutes).padStart(2, "0"), label: "min" },
            { value: String(seconds).padStart(2, "0"), label: "s" },
          ].map((u, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "3rem" }}>
              <strong style={{ fontFamily: "monospace", fontSize: "1.6rem", fontWeight: 700 }}>{u.value}</strong>
              <span style={{ fontSize: "0.7rem", opacity: 0.6, textTransform: "uppercase" }}>{u.label}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "0.78rem", opacity: 0.55, margin: 0 }}>
          Essa etapa estará disponível somente para participantes da campanha.
        </p>
      </section>
    );
  }

  if (mission.completed || mission.bonusRaffleNumber) {
    return (
      <section
        style={{
          ...cardBase,
          background: "rgba(79, 95, 255, 0.1)",
          border: "1px solid rgba(79, 95, 255, 0.3)",
        }}
      >
        <span style={{ display: "block", fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>
          🎉 VOCÊ DESBLOQUEOU UM NOVO NÚMERO!
        </span>
        {mission.bonusRaffleNumber && (
          <p
            style={{
              fontFamily: "monospace",
              fontSize: "1.3rem",
              fontWeight: 700,
              color: "var(--primary, #4f5fff)",
              margin: 0,
            }}
          >
            Número da Sorte 2: #{mission.bonusRaffleNumber}
          </p>
        )}
      </section>
    );
  }

  return (
    <section
      style={{
        ...cardBase,
        background: "rgba(232, 182, 70, 0.08)",
        border: "1px solid rgba(232, 182, 70, 0.35)",
      }}
    >
      <span style={{ display: "inline-block", fontSize: "0.85rem", fontWeight: 700, color: "#e8b646", marginBottom: "0.75rem" }}>
        🎉 SURPRESA DESBLOQUEADA
      </span>
      <h3 style={{ fontFamily: "Sora, system-ui, sans-serif", margin: "0 0 0.6rem" }}>{mission.title}</h3>
      {mission.description && (
        <p style={{ opacity: 0.75, lineHeight: 1.6, margin: "0 0 1.25rem", fontSize: "0.9rem" }}>
          {mission.description}
        </p>
      )}
      <SurpriseAction
        mission={mission}
        onDone={(n) => setMission((m) => ({ ...m, completed: true, bonusRaffleNumber: n }))}
      />
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
  // Quando a missão pede link + foto juntos (ex: "entre no link e envie o
  // print"), a pessoa precisa confirmar o link ANTES de poder enviar a
  // foto - garante que ela realmente passou pelas duas etapas na ordem.
  const [linkVisited, setLinkVisited] = useState(false);

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

  const confirmBtnStyle: React.CSSProperties = {
    background: "#e8b646",
    color: "#12121a",
    border: "none",
    borderRadius: "999px",
    padding: "0.6rem 1.3rem",
    fontWeight: 700,
    fontSize: "0.88rem",
    cursor: "pointer",
  };
  const linkBtnStyle: React.CSSProperties = {
    display: "inline-block",
    color: "#e8b646",
    fontSize: "0.85rem",
    fontWeight: 600,
    textDecoration: "none",
    border: "1px solid rgba(232, 182, 70, 0.4)",
    borderRadius: "999px",
    padding: "0.45rem 0.9rem",
  };

  const needsLinkFirst = mission.type === "PHOTO_UPLOAD" && !!mission.linkUrl && !linkVisited;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
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
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", width: "100%", maxWidth: "20rem" }}>
            {mission.quizOptions.map((opt, i) => (
              <label
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.85rem",
                  padding: "0.45rem 0.6rem",
                  border: `1px solid ${selected === i ? "#e8b646" : "rgba(255,255,255,0.15)"}`,
                  background: selected === i ? "rgba(232, 182, 70, 0.1)" : "transparent",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <input type="radio" name="surprise-quiz" checked={selected === i} onChange={() => setSelected(i)} />
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
          {needsLinkFirst && (
            <>
              <a
                href={mission.linkUrl!}
                target="_blank"
                rel="noopener noreferrer"
                style={linkBtnStyle}
                onClick={() => setLinkVisited(true)}
              >
                1. Abrir link ↗
              </a>
              <p style={{ fontSize: "0.78rem", opacity: 0.55, margin: 0 }}>
                Depois de abrir o link, volte aqui pra enviar a foto.
              </p>
            </>
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
                fontSize: "0.88rem",
                cursor: uploading || busy ? "default" : "pointer",
                opacity: uploading || busy ? 0.7 : 1,
              }}
            >
              {uploading || busy ? "Enviando…" : file ? `📎 ${file.name}` : "2. Escolher foto 📷"}
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

      {error && (
        <p style={{ width: "100%", fontSize: "0.8rem", color: "#fca5a5", margin: 0 }}>{error}</p>
      )}
    </div>
  );
}
