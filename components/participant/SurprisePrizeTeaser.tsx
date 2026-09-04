"use client";

import { useEffect, useState } from "react";

function useCountdown(target: string | null) {
  const [remaining, setRemaining] = useState(() =>
    target ? new Date(target).getTime() - Date.now() : null
  );

  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setRemaining(new Date(target).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);

  if (remaining === null) return null;
  const totalSeconds = Math.max(0, Math.floor(remaining / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/**
 * Teaser de prêmio surpresa ainda não revelado - fica FORA do PrizePath
 * (aquela trilha de círculos não tem espaço pra contador+botão), como uma
 * seção própria logo abaixo. Não mostra nome/imagem/descrição do prêmio de
 * propósito - só existe pra avisar "tem mais uma coisa vindo" e coletar
 * quem quer aviso quando revelar (o e-mail em si é disparado à parte, pelo
 * Brevo, a partir da lista exportada no admin).
 */
export function SurprisePrizeTeaser({
  prizeId,
  unlockAt,
  alreadyRequested,
}: {
  prizeId: string;
  unlockAt: string | null;
  alreadyRequested: boolean;
}) {
  const countdown = useCountdown(unlockAt);
  const [requested, setRequested] = useState(alreadyRequested);
  const [busy, setBusy] = useState(false);

  async function activate() {
    setBusy(true);
    const res = await fetch(`/api/public/prizes/${prizeId}/notify`, { method: "POST" });
    setBusy(false);
    if (res.ok) setRequested(true);
  }

  return (
    <section className="teaser">
      <span className="eyebrow">🎁 Tem mais um prêmio a caminho</span>
      <p className="text">
        Fique de olho — daqui a pouco tem outro prêmio se juntando a essa campanha.
      </p>

      {countdown ? (
        <div className="units">
          <Unit value={countdown.days} label="dias" />
          <Unit value={countdown.hours} label="h" />
          <Unit value={countdown.minutes} label="min" />
          <Unit value={countdown.seconds} label="s" />
        </div>
      ) : (
        <p className="tbd">Data a definir</p>
      )}

      <button type="button" className="notify-btn" onClick={activate} disabled={busy || requested}>
        {requested ? "✅ Notificação ativada" : busy ? "…" : "🔔 Ativar notificação por e-mail"}
      </button>

      <style jsx>{`
        .teaser {
          max-width: 30rem;
          margin: 0 auto 2.5rem;
          padding: 1.75rem;
          border-radius: 1.1rem;
          text-align: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px dashed rgba(232, 182, 70, 0.35);
        }
        .eyebrow {
          display: inline-block;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          color: #e8b646;
          margin-bottom: 0.75rem;
        }
        .text {
          opacity: 0.8;
          line-height: 1.6;
          margin: 0 0 1.25rem;
          font-size: 0.9rem;
        }
        .units {
          display: flex;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 1.4rem;
        }
        .tbd {
          font-size: 0.85rem;
          opacity: 0.6;
          margin: 0 0 1.4rem;
        }
        .notify-btn {
          background: #e8b646;
          color: #12121a;
          border: none;
          border-radius: 999px;
          padding: 0.65rem 1.4rem;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
        }
        .notify-btn:disabled {
          opacity: 0.75;
          cursor: default;
        }
      `}</style>
    </section>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="unit">
      <strong>{String(value).padStart(2, "0")}</strong>
      <span>{label}</span>
      <style jsx>{`
        .unit {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 3rem;
        }
        .unit strong {
          font-family: monospace;
          font-size: 1.4rem;
        }
        .unit span {
          font-size: 0.65rem;
          opacity: 0.6;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
