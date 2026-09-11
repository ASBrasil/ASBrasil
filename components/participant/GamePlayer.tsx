"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { generateReactionSequence, type ReactionConfig } from "@/lib/games";

interface Question {
  question: string;
  options: string[];
}

interface PhaseResult {
  completed: boolean;
  firstScore: number;
  attempts: number;
}

interface Phase {
  id: string;
  order: number;
  title: string;
  type: "QUIZ" | "REACTION";
  points: number;
  grantsExtraTicket: boolean;
  hasRewardCard: boolean;
  questions: Question[];
  reactionConfig: ReactionConfig | null;
  result: PhaseResult | null;
}

interface GameTheme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundImageUrl?: string | null;
}

// Modo Rush (11/09) - jogo inteiro cronometrado, com bônus de pontuação por
// velocidade quando a fase é 100% acertada. Config vem de Game.theme (ver
// lib/games.ts::getRushConfig), sem exigir schema novo.
interface RushConfig {
  enabled: boolean;
  timeLimitSeconds: number;
}

interface GameInfo {
  id: string;
  name: string;
  eventName: string;
  theme: GameTheme | null;
  rush: RushConfig;
}

interface CompleteResponse {
  correctCount: number;
  total: number;
  percent: number;
  isPerfect: boolean;
  alreadyPlayed: boolean;
  cardWon: { id: string; name: string; rarity: string; imageUrl: string | null } | null;
  extraTicketNumber: number | null;
  speedMultiplier: number | null;
  // Só presentes em fases REACTION (ver rota complete/route.ts, `...extra`).
  avgMs?: number | null;
  tier?: string;
}

function emptyAnswers(phase: Phase | undefined) {
  return Array<number | null>(phase?.questions.length ?? 0).fill(null);
}

export function GamePlayer({
  game,
  phases,
  isEventParticipant,
}: {
  game: GameInfo;
  phases: Phase[];
  isEventParticipant: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => emptyAnswers(phases[0]));
  const [result, setResult] = useState<CompleteResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phase = phases[index];
  const isLast = index === phases.length - 1;
  const allAnswered = answers.length > 0 && answers.every((a) => a !== null);

  // --- Modo Rush: cronômetro por fase (só faz sentido pra QUIZ - Reaction já
  // tem seu próprio cronômetro por rodada, ver ReactionStage) --------------
  const rushEnabled = game.rush.enabled && phase.type !== "REACTION";
  const timeLimitMs = game.rush.timeLimitSeconds * 1000;
  const [msLeft, setMsLeft] = useState(timeLimitMs);
  const phaseStartRef = useRef<number>(Date.now());
  const submitRef = useRef<() => void>(() => {});

  // Reinicia o cronômetro sempre que a fase muda (ou some, se não tiver
  // fase/modo rush) - guardado num ref porque o timeout/interval abaixo
  // precisa ler o valor mais recente sem recriar o efeito toda hora.
  useEffect(() => {
    if (!rushEnabled || result) return;
    phaseStartRef.current = Date.now();
    setMsLeft(timeLimitMs);
    const interval = setInterval(() => {
      const left = timeLimitMs - (Date.now() - phaseStartRef.current);
      if (left <= 0) {
        setMsLeft(0);
        clearInterval(interval);
        submitRef.current();
      } else {
        setMsLeft(left);
      }
    }, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rushEnabled, index, result, timeLimitMs]);

  const bg = game.theme?.backgroundImageUrl
    ? `linear-gradient(180deg, ${game.theme.primaryColor || "#3B55E6"}dd, ${
        game.theme.secondaryColor || "#0c2a5b"
      }ee), url(${game.theme.backgroundImageUrl}) center/cover fixed`
    : `radial-gradient(ellipse 80% 60% at 50% -10%, ${game.theme?.primaryColor || "#1b2a5c"} 0%, ${
        game.theme?.secondaryColor || "#0a1330"
      } 55%, #05070f 100%)`;

  function goToPhase(i: number) {
    setIndex(i);
    setAnswers(emptyAnswers(phases[i]));
    setResult(null);
    setError(null);
  }

  async function postComplete(body: Record<string, unknown>) {
    if (submitting || result) return; // evita disparo duplo (botão + timeout do rush quase juntos)
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/public/games/phases/${phase.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    setSubmitting(false);
    if (!res.ok || !data) {
      setError(data?.error ?? "Não foi possível registrar sua resposta. Tente de novo.");
      return;
    }
    setResult(data);
  }

  async function submit() {
    const elapsedMs = Date.now() - phaseStartRef.current;
    await postComplete(rushEnabled ? { answers, elapsedMs } : { answers });
  }
  submitRef.current = submit;

  async function submitReaction(rounds: { tapped: boolean; ms: number | null }[]) {
    await postComplete({ rounds });
  }

  if (phases.length === 0) {
    return (
      <div className="wrap" style={{ background: bg }}>
        <div className="card">
          <p className="empty">Esse jogo ainda não tem fases prontas. Volte mais tarde!</p>
        </div>
        <Styles />
      </div>
    );
  }

  return (
    <div className="wrap" style={{ background: bg }}>
      <div className="card">
        <div className="progress-dots">
          {phases.map((p, i) => (
            <span
              key={p.id}
              className={`dot ${i === index ? "active" : ""} ${p.result ? "done" : ""}`}
              title={p.title}
            />
          ))}
        </div>

        {!result ? (
          <>
            {rushEnabled && (
              <div className="rush-bar" aria-label="Tempo restante">
                <div
                  className="rush-bar-fill"
                  style={{
                    width: `${Math.max(0, (msLeft / timeLimitMs) * 100)}%`,
                    background: msLeft < timeLimitMs * 0.25 ? "#dc2626" : "var(--primary, #4f5fff)",
                  }}
                />
                <span className="rush-seconds">{Math.ceil(msLeft / 1000)}s</span>
              </div>
            )}
            <h2>{phase.title}</h2>
            {phase.result && (
              <p className="already-note">
                Você já jogou essa fase antes ({phase.result.attempts}x) - a pontuação da sua
                primeira tentativa é a que vale, jogar de novo é só pra treinar.
              </p>
            )}
            {phase.grantsExtraTicket && !isEventParticipant && phase.type !== "REACTION" && (
              <p className="note">
                Como você não está inscrito em <strong>{game.eventName}</strong>, essa fase te dá
                pontos e cards normalmente, mas não o número extra do sorteio.
              </p>
            )}

            {phase.type === "REACTION" && phase.reactionConfig ? (
              <ReactionStage
                key={phase.id}
                phaseId={phase.id}
                config={phase.reactionConfig}
                onComplete={submitReaction}
              />
            ) : (
              <>
                <div className="questions">
                  {phase.questions.map((q, qi) => (
                    <div key={qi} className="question">
                      <p className="question-text">
                        {qi + 1}. {q.question}
                      </p>
                      <div className="options">
                        {q.options.map((opt, oi) => (
                          <label key={oi} className={`option ${answers[qi] === oi ? "selected" : ""}`}>
                            <input
                              type="radio"
                              name={`q-${qi}`}
                              checked={answers[qi] === oi}
                              onChange={() => {
                                const next = [...answers];
                                next[qi] = oi;
                                setAnswers(next);
                                // No Rush, com fase de 1 pergunta só (o caso mais comum), envia na
                                // hora - é o que dá a sensação de "correria" pedida; com mais de uma
                                // pergunta na fase, mantém o botão normal de confirmar.
                                if (rushEnabled && phase.questions.length === 1) {
                                  setTimeout(() => submitRef.current(), 0);
                                }
                              }}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button className="submit-btn" disabled={!allAnswered || submitting} onClick={submit}>
                  {submitting ? "Conferindo…" : "Confirmar respostas"}
                </button>
              </>
            )}

            {error && <p className="error">{error}</p>}
          </>
        ) : (
          <ResultScreen
            phase={phase}
            game={game}
            result={result}
            isLast={isLast}
            onNext={() => goToPhase(index + 1)}
          />
        )}
      </div>
      <Styles />
    </div>
  );
}

function ResultScreen({
  phase,
  game,
  result,
  isLast,
  onNext,
}: {
  phase: Phase;
  game: GameInfo;
  result: CompleteResponse;
  isLast: boolean;
  onNext: () => void;
}) {
  const [sharing, setSharing] = useState(false);

  async function downloadImage(url: string, filename: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Última alternativa: abre a imagem numa aba nova pra salvar manualmente
      // (segura o dedo na imagem no celular, ou botão direito no desktop).
      window.open(url, "_blank");
    }
  }

  async function shareCard() {
    if (!result.cardWon?.imageUrl) return;
    setSharing(true);
    const url = result.cardWon.imageUrl;
    const name = result.cardWon.name;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], `${name}.png`, { type: blob.type || "image/png" });
      const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Ganhei a carta ${name}!`,
          text: `Acabei de ganhar a carta "${name}" jogando ${game.name} no Universo AS! 🎮`,
        });
        setSharing(false);
        return;
      }
    } catch {
      // segue pro fallback de download abaixo
    }
    await downloadImage(url, `${name}.png`);
    setSharing(false);
  }

  return (
    <div className="result">
      <div className="score-circle">
        <strong>{result.percent}%</strong>
        <span>
          {result.correctCount}/{result.total} certas
        </span>
      </div>

      <h2>{result.isPerfect ? "🎉 Mandou muito bem!" : "Quase lá!"}</h2>

      {typeof result.tier === "string" && (
        <p className="reaction-tier">
          {result.tier}
          {result.avgMs != null ? ` · média ${result.avgMs}ms` : ""}
        </p>
      )}

      {result.isPerfect && !result.alreadyPlayed && result.speedMultiplier && result.speedMultiplier > 1 && (
        <p className="speed-bonus">
          ⚡ Bônus de velocidade: +{Math.round((result.speedMultiplier - 1) * 100)}% de pontos!
        </p>
      )}

      {result.alreadyPlayed && (
        <p className="already-note">Esse foi um replay - o resultado que valeu foi o da sua primeira vez.</p>
      )}

      {!result.isPerfect && !result.alreadyPlayed && phase.hasRewardCard && (
        <p className="note">Essa fase tinha uma carta pra quem acerta tudo - na próxima fase você pode tentar de novo!</p>
      )}

      {result.cardWon && (
        <div className="card-won">
          <p className="card-won-label">🎴 Você ganhou uma carta!</p>
          <div className="card-image-wrap">
            {result.cardWon.imageUrl ? (
              <img src={result.cardWon.imageUrl} alt={result.cardWon.name} className="card-image" />
            ) : (
              <div className="card-image placeholder">🎴</div>
            )}
          </div>
          <p className="card-name">{result.cardWon.name}</p>
          <span className="card-rarity">{result.cardWon.rarity}</span>
          {result.cardWon.imageUrl && (
            <div className="card-actions">
              <button
                className="secondary-btn"
                onClick={() => downloadImage(result.cardWon!.imageUrl!, `${result.cardWon!.name}.png`)}
              >
                ⬇️ Baixar
              </button>
              <button className="secondary-btn" disabled={sharing} onClick={shareCard}>
                {sharing ? "Preparando…" : "📤 Compartilhar"}
              </button>
            </div>
          )}
        </div>
      )}

      {result.extraTicketNumber !== null && (
        <div className="ticket-won">
          <p>🎟️ Número extra no sorteio de {game.eventName}:</p>
          <strong>#{result.extraTicketNumber}</strong>
        </div>
      )}

      {isLast ? (
        <p className="finished">É isso - você concluiu todas as fases desse jogo por enquanto!</p>
      ) : (
        <button className="submit-btn" onClick={onNext}>
          Próxima fase →
        </button>
      )}
    </div>
  );
}

// Janela máxima pra reagir a um alvo antes de contar como "não tocou" -
// intencionalmente maior que qualquer tempo de reação humano real, só existe
// pra não travar a rodada indefinidamente se a pessoa simplesmente não tocar.
const REACTION_MISS_WINDOW_MS = 1200;

function ReactionStage({
  phaseId,
  config,
  onComplete,
}: {
  phaseId: string;
  config: ReactionConfig;
  onComplete: (rounds: { tapped: boolean; ms: number | null }[]) => void;
}) {
  // Mesma sequência determinística que o servidor recalcula pra conferir -
  // ver lib/games.ts::generateReactionSequence. Calculada uma vez só por
  // fase (não muda entre rodadas, nem se o componente re-renderizar).
  const sequence = useMemo(() => generateReactionSequence(phaseId, config), [phaseId, config]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [stage, setStage] = useState<"waiting" | "target">("waiting");
  const resultsRef = useRef<{ tapped: boolean; ms: number | null }[]>([]);
  const shownAtRef = useRef(0);
  const missTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedRef = useRef(false);

  const isDecoy = sequence[roundIndex] ?? false;
  const totalRounds = config.rounds;

  useEffect(() => {
    if (finishedRef.current || roundIndex >= totalRounds) return;
    setStage("waiting");
    const delay = config.minDelayMs + Math.random() * (config.maxDelayMs - config.minDelayMs);
    const showTimer = setTimeout(() => {
      shownAtRef.current = Date.now();
      setStage("target");
      missTimeoutRef.current = setTimeout(() => {
        registerRound({ tapped: false, ms: null });
      }, REACTION_MISS_WINDOW_MS);
    }, delay);
    return () => {
      clearTimeout(showTimer);
      if (missTimeoutRef.current) clearTimeout(missTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex]);

  function registerRound(entry: { tapped: boolean; ms: number | null }) {
    if (missTimeoutRef.current) clearTimeout(missTimeoutRef.current);
    resultsRef.current.push(entry);
    const next = roundIndex + 1;
    if (next >= totalRounds) {
      finishedRef.current = true;
      onComplete(resultsRef.current);
    } else {
      setRoundIndex(next);
    }
  }

  function handleTap() {
    if (stage !== "target") return;
    registerRound({ tapped: true, ms: Date.now() - shownAtRef.current });
  }

  return (
    <div className="reaction-stage">
      <p className="reaction-round">
        Rodada {Math.min(roundIndex + 1, totalRounds)}/{totalRounds}
      </p>
      <button
        type="button"
        className={`reaction-target ${stage}${stage === "target" ? (isDecoy ? " decoy" : " real") : ""}`}
        onClick={handleTap}
        disabled={stage !== "target"}
      >
        {stage === "waiting" ? "…" : isDecoy ? "NÃO TOQUE" : "TOQUE!"}
      </button>
      <p className="reaction-hint">
        {stage === "waiting"
          ? "Prepare o dedo…"
          : isDecoy
          ? "Isso é um chamariz - segura o dedo!"
          : "Vai!"}
      </p>
    </div>
  );
}

function Styles() {
  return (
    <style jsx global>{`
      .wrap {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4rem 1.25rem;
        font-family: system-ui, sans-serif;
        color: #f5f6fa;
      }
      .card {
        width: 100%;
        max-width: 32rem;
        background: rgba(10, 14, 32, 0.72);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 1.25rem;
        padding: 2rem 1.75rem;
        box-shadow: 0 2rem 5rem rgba(0, 0, 0, 0.45);
      }
      .empty {
        text-align: center;
        opacity: 0.75;
        margin: 0;
      }
      .rush-bar {
        position: relative;
        height: 0.5rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        margin-bottom: 1.1rem;
        overflow: hidden;
      }
      .rush-bar-fill {
        height: 100%;
        border-radius: 999px;
        transition: width 0.1s linear, background 0.2s;
      }
      .rush-seconds {
        position: absolute;
        top: -1.35rem;
        right: 0;
        font-size: 0.75rem;
        font-weight: 700;
        opacity: 0.8;
      }
      .speed-bonus {
        text-align: center;
        font-weight: 700;
        color: #fbbf24;
        margin: -0.5rem 0 0.75rem;
      }
      .reaction-tier {
        text-align: center;
        font-weight: 700;
        color: #e8b646;
        margin: -0.5rem 0 1rem;
      }
      .reaction-stage {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 1rem 0 1.5rem;
      }
      .reaction-round {
        margin: 0;
        font-size: 0.8rem;
        opacity: 0.7;
      }
      .reaction-target {
        width: 11rem;
        height: 11rem;
        border-radius: 999px;
        border: none;
        font-weight: 800;
        font-size: 1.05rem;
        letter-spacing: 0.02em;
        color: #fff;
        cursor: pointer;
        transition: background 0.15s, transform 0.1s;
        background: rgba(255, 255, 255, 0.1);
      }
      .reaction-target.waiting {
        cursor: default;
        opacity: 0.6;
      }
      .reaction-target.target.real {
        background: #16a34a;
        box-shadow: 0 0 3rem rgba(22, 163, 74, 0.5);
      }
      .reaction-target.target.decoy {
        background: #dc2626;
        box-shadow: 0 0 3rem rgba(220, 38, 38, 0.5);
      }
      .reaction-target:active:not(:disabled) {
        transform: scale(0.96);
      }
      .reaction-hint {
        margin: 0;
        font-size: 0.85rem;
        opacity: 0.75;
        min-height: 1.2em;
      }
      .progress-dots {
        display: flex;
        justify-content: center;
        gap: 0.4rem;
        margin-bottom: 1.5rem;
      }
      .dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.2);
      }
      .dot.done {
        background: #e8b646;
      }
      .dot.active {
        background: #fff;
        transform: scale(1.3);
      }
      h2 {
        font-family: "Sora", system-ui, sans-serif;
        font-size: 1.3rem;
        margin: 0 0 1rem;
        text-align: center;
      }
      .already-note,
      .note {
        font-size: 0.8rem;
        opacity: 0.7;
        line-height: 1.5;
        text-align: center;
        margin: 0 0 1.25rem;
      }
      .questions {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        margin-bottom: 1.5rem;
      }
      .question-text {
        font-weight: 600;
        font-size: 0.92rem;
        margin: 0 0 0.6rem;
      }
      .options {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .option {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        font-size: 0.87rem;
        padding: 0.55rem 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 0.6rem;
        cursor: pointer;
      }
      .option.selected {
        border-color: #e8b646;
        background: rgba(232, 182, 70, 0.1);
      }
      .error {
        color: #fca5a5;
        font-size: 0.82rem;
        text-align: center;
        margin: 0 0 1rem;
      }
      .submit-btn {
        display: block;
        width: 100%;
        background: #e8b646;
        color: #12121a;
        border: none;
        border-radius: 999px;
        padding: 0.8rem 1.3rem;
        font-weight: 700;
        font-size: 0.92rem;
        cursor: pointer;
      }
      .submit-btn:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .result {
        text-align: center;
      }
      .score-circle {
        width: 6.5rem;
        height: 6.5rem;
        border-radius: 999px;
        border: 3px solid #e8b646;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.25rem;
      }
      .score-circle strong {
        font-size: 1.4rem;
        font-family: "Sora", system-ui, sans-serif;
      }
      .score-circle span {
        font-size: 0.68rem;
        opacity: 0.7;
      }
      .card-won {
        margin: 1.5rem 0;
        padding: 1.25rem;
        border-radius: 1rem;
        background: rgba(232, 182, 70, 0.08);
        border: 1px solid rgba(232, 182, 70, 0.3);
      }
      .card-won-label {
        margin: 0 0 0.9rem;
        font-weight: 700;
        font-size: 0.9rem;
      }
      .card-image-wrap {
        display: flex;
        justify-content: center;
      }
      .card-image {
        width: 9rem;
        aspect-ratio: 1 / 1;
        object-fit: cover;
        border-radius: 0.8rem;
      }
      .card-image.placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.08);
        font-size: 2.5rem;
      }
      .card-name {
        margin: 0.75rem 0 0.15rem;
        font-weight: 700;
      }
      .card-rarity {
        font-size: 0.72rem;
        text-transform: uppercase;
        opacity: 0.65;
      }
      .card-actions {
        display: flex;
        justify-content: center;
        gap: 0.6rem;
        margin-top: 1rem;
      }
      .secondary-btn {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: #fff;
        border-radius: 999px;
        padding: 0.5rem 1rem;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
      }
      .secondary-btn:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .ticket-won {
        margin: 1.25rem 0;
        padding: 1rem;
        border-radius: 0.8rem;
        background: rgba(79, 95, 255, 0.12);
        border: 1px solid rgba(79, 95, 255, 0.35);
      }
      .ticket-won p {
        margin: 0 0 0.3rem;
        font-size: 0.82rem;
        opacity: 0.85;
      }
      .ticket-won strong {
        font-family: monospace;
        font-size: 1.3rem;
        color: #4f5fff;
      }
      .finished {
        font-size: 0.85rem;
        opacity: 0.75;
        margin-top: 1.5rem;
      }
    `}</style>
  );
}
