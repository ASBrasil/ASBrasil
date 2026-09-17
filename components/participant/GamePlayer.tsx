"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  generateReactionSequence,
  type ReactionConfig,
  type MemoryConfig,
  type RunConfig,
  type TicketConfig,
  type PerfectPickConfig,
  perfectPickRoundDuration,
  RUN_LANES,
  RUN_MIN_SPAWN_MS,
  RUN_MAX_SPAWN_MS,
  RUN_POINTS_PER_ITEM,
  RUN_MAX_COMBO,
  RUN_LIVES,
  TICKET_MIN_SPAWN_MS,
  TICKET_MAX_SPAWN_MS,
  TICKET_POINTS_PER_ITEM,
  TICKET_MAX_COMBO,
  TICKET_LIVES,
  TICKET_FAKE_CHANCE,
} from "@/lib/games";
import {
  IconStar,
  IconFlame,
  IconHeart,
  IconClock,
  IconTicket,
  IconTicketBan,
  IconCone,
  IconLightning,
  IconSparkle,
  IconShare,
  IconCardBack,
  MEMORY_ICONS,
} from "./GameIcons";

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
  type: "QUIZ" | "REACTION" | "MEMORY" | "RUN" | "TICKET" | "PICK";
  points: number;
  grantsExtraTicket: boolean;
  hasRewardCard: boolean;
  questions: Question[];
  reactionConfig: ReactionConfig | null;
  memoryConfig: MemoryConfig | null;
  runConfig: RunConfig | null;
  ticketConfig: TicketConfig | null;
  pickConfig: PerfectPickConfig | null;
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
  // Só presentes em fases REACTION/MEMORY/RUN/TICKET/PICK (ver rota complete/route.ts, `...extra`).
  avgMs?: number | null;
  tier?: string;
  moves?: number;
  score?: number;
  maxCombo?: number;
  avgQuality?: number;
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

  // --- Modo Rush: cronômetro por fase (só faz sentido pra QUIZ - Reaction e
  // Memory já têm seu próprio cronômetro/ritmo próprio, ver ReactionStage e
  // MemoryStage) -------------------------------------------------------
  const rushEnabled = game.rush.enabled && phase.type === "QUIZ";
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

  async function submitMemory(result: { moves: number; elapsedMs: number }) {
    await postComplete(result);
  }

  async function submitRun(result: { score: number; maxCombo: number; elapsedMs: number }) {
    await postComplete(result);
  }

  async function submitTicket(result: { score: number; maxCombo: number; elapsedMs: number }) {
    await postComplete(result);
  }

  async function submitPick(rounds: { ms: number | null }[]) {
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
            {phase.grantsExtraTicket && !isEventParticipant && phase.type === "QUIZ" && (
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
            ) : phase.type === "MEMORY" && phase.memoryConfig ? (
              <MemoryStage key={phase.id} config={phase.memoryConfig} onComplete={submitMemory} />
            ) : phase.type === "RUN" && phase.runConfig ? (
              <RunStage
                key={phase.id}
                config={phase.runConfig}
                onComplete={submitRun}
                accent={game.theme?.primaryColor || "#8b5cf6"}
              />
            ) : phase.type === "TICKET" && phase.ticketConfig ? (
              <TicketStage
                key={phase.id}
                config={phase.ticketConfig}
                onComplete={submitTicket}
                accent={game.theme?.primaryColor || "#8b5cf6"}
              />
            ) : phase.type === "PICK" && phase.pickConfig ? (
              <PerfectPickStage key={phase.id} config={phase.pickConfig} onComplete={submitPick} />
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

      <h2 className={result.isPerfect ? "result-title perfect" : "result-title"}>
        {result.isPerfect && <IconSparkle size={22} className="inline-icon" />}
        {result.isPerfect ? "Mandou muito bem!" : "Quase lá!"}
      </h2>

      {typeof result.tier === "string" && (
        <p className="reaction-tier">
          {result.tier}
          {result.avgMs != null ? ` · média ${result.avgMs}ms` : ""}
          {typeof result.moves === "number" ? ` · ${result.moves} jogadas` : ""}
          {typeof result.score === "number" ? ` · ${result.score} pts` : ""}
          {typeof result.maxCombo === "number" && result.maxCombo > 1 ? ` · combo x${result.maxCombo}` : ""}
          {typeof result.avgQuality === "number" ? ` · ${result.avgQuality}% de precisão` : ""}
        </p>
      )}

      {result.isPerfect && !result.alreadyPlayed && result.speedMultiplier && result.speedMultiplier > 1 && (
        <p className="speed-bonus">
          <IconLightning size={16} className="inline-icon" /> Bônus de velocidade: +
          {Math.round((result.speedMultiplier - 1) * 100)}% de pontos!
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
          <p className="card-won-label">
            <IconCardBack size={16} className="inline-icon" /> Você ganhou uma carta!
          </p>
          <div className="card-image-wrap">
            {result.cardWon.imageUrl ? (
              <img src={result.cardWon.imageUrl} alt={result.cardWon.name} className="card-image" />
            ) : (
              <div className="card-image placeholder">
                <IconCardBack size={44} />
              </div>
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
                {sharing ? (
                  "Preparando…"
                ) : (
                  <>
                    <IconShare size={14} className="inline-icon" /> Compartilhar
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {result.extraTicketNumber !== null && (
        <div className="ticket-won">
          <p>
            <IconTicket size={16} className="inline-icon" /> Número extra no sorteio de {game.eventName}:
          </p>
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

// Símbolos usados nas cartas - ícones SVG originais e genéricos o suficiente
// pra qualquer tema de evento (não são específicos de BTS/Stray Kids/etc,
// então funcionam pra qualquer Game.theme sem precisar trocar por evento).
// Suporta até 18 pares (ver MEMORY_ICONS em GameIcons.tsx).

interface MemoryCard {
  symbol: number;
  matched: boolean;
}

function shuffledMemoryDeck(pairs: number): MemoryCard[] {
  const symbols = MEMORY_ICONS.slice(0, pairs).map((_, i) => i);
  const deck: MemoryCard[] = symbols.flatMap((symbol) => [
    { symbol, matched: false },
    { symbol, matched: false },
  ]);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function MemoryStage({
  config,
  onComplete,
}: {
  config: MemoryConfig;
  onComplete: (result: { moves: number; elapsedMs: number }) => void;
}) {
  // Embaralha uma vez só quando o componente monta - não precisa de seed
  // nenhuma (ver comentário em lib/games.ts sobre por que Memory não precisa
  // de verificação de servidor pro layout das cartas).
  const [deck, setDeck] = useState<MemoryCard[]>(() => shuffledMemoryDeck(config.pairs));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const startRef = useRef(Date.now());
  const finishedRef = useRef(false);

  const totalPairs = config.pairs;
  const matchedCount = deck.filter((c) => c.matched).length / 2;
  const columns = deck.length <= 12 ? 4 : deck.length <= 20 ? 5 : 6;

  function handleFlip(i: number) {
    if (locked || flipped.includes(i) || deck[i].matched || flipped.length === 2) return;
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length === 2) {
      setLocked(true);
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (deck[a].symbol === deck[b].symbol) {
        setTimeout(() => {
          const nextDeck = deck.map((c, idx) => (idx === a || idx === b ? { ...c, matched: true } : c));
          setDeck(nextDeck);
          setFlipped([]);
          setLocked(false);
          const done = nextDeck.every((c) => c.matched);
          if (done && !finishedRef.current) {
            finishedRef.current = true;
            onComplete({ moves: moves + 1, elapsedMs: Date.now() - startRef.current });
          }
        }, 500);
      } else {
        setTimeout(() => {
          setFlipped([]);
          setLocked(false);
        }, 900);
      }
    }
  }

  return (
    <div className="memory-stage">
      <p className="memory-progress">
        {matchedCount}/{totalPairs} pares · {moves} jogadas
      </p>
      <div className="memory-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {deck.map((card, i) => {
          const isFaceUp = card.matched || flipped.includes(i);
          const Icon = MEMORY_ICONS[card.symbol] ?? MEMORY_ICONS[0];
          return (
            <button
              key={i}
              type="button"
              className={`memory-card ${isFaceUp ? "face-up" : ""} ${card.matched ? "matched" : ""}`}
              onClick={() => handleFlip(i)}
              disabled={isFaceUp}
              aria-label={isFaceUp ? `Carta ${card.symbol + 1}` : "Carta virada pra baixo"}
            >
              {isFaceUp ? <Icon size={26} /> : "?"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- AS Run --------------------------------------------------------------
const RUN_CANVAS_W = 300;
const RUN_CANVAS_H = 460;
const RUN_LANE_W = RUN_CANVAS_W / RUN_LANES;
const RUN_PLAYER_Y = RUN_CANVAS_H - 64;
const RUN_ITEM_SIZE = 34;
const RUN_FALL_PX_PER_MS = 0.22;

interface RunItem {
  lane: number;
  y: number;
  kind: "good" | "bad";
  resolved: boolean;
}

// Desenha a pista (asfalto + acostamento + faixas tracejadas rolando) - troca
// o fundo genérico por algo que lê como "rua de verdade" mesmo em Canvas 2D
// simples, sem precisar de nenhuma imagem externa.
function drawRoad(ctx: CanvasRenderingContext2D, offset: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, RUN_CANVAS_H);
  grad.addColorStop(0, "#2a2a38");
  grad.addColorStop(1, "#17171f");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, RUN_CANVAS_W, RUN_CANVAS_H);

  // acostamento com faixa de segurança tracejada (amarela), nas duas bordas
  ctx.fillStyle = "#3d3d4d";
  ctx.fillRect(0, 0, 8, RUN_CANVAS_H);
  ctx.fillRect(RUN_CANVAS_W - 8, 0, 8, RUN_CANVAS_H);
  ctx.strokeStyle = "rgba(250, 204, 21, 0.85)";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([10, 10]);
  ctx.lineDashOffset = -offset;
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(4, RUN_CANVAS_H);
  ctx.moveTo(RUN_CANVAS_W - 4, 0);
  ctx.lineTo(RUN_CANVAS_W - 4, RUN_CANVAS_H);
  ctx.stroke();

  // faixas de divisão de pista (brancas, tracejadas, rolando pra dar
  // sensação de movimento)
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 3;
  ctx.setLineDash([20, 18]);
  ctx.lineDashOffset = -offset;
  for (let i = 1; i < RUN_LANES; i++) {
    const x = i * RUN_LANE_W;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, RUN_CANVAS_H);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

// Silhueta simples de corredor, com pernas/braços em tesoura animados pela
// fase (sobe/desce em onda) - dá pra entender de longe que é "alguém
// correndo" sem precisar de sprite/imagem nenhuma.
function drawRunner(ctx: CanvasRenderingContext2D, cx: number, cy: number, phase: number, color: string) {
  const swing = Math.sin(phase) * 9;
  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 25, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-1.5, 6);
  ctx.lineTo(-1.5 - swing * 0.6, 23);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1.5, 6);
  ctx.lineTo(1.5 + swing * 0.6, 23);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(0, 6);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(swing * 0.7, 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-swing * 0.7, 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, -19.5, 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Ticket estilizado (recorte + linha picotada, igual o ícone IconTicket) -
// reaproveitado tanto no AS Run (item "bom") quanto no Ticket Rush (item
// "válido"), pra manter a mesma linguagem visual nos dois jogos de ação.
function drawTicketShape(ctx: CanvasRenderingContext2D, size: number, color: string) {
  const w = size * 1.05;
  const h = size * 0.62;
  ctx.fillStyle = color;
  roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.22);
  ctx.fill();
  ctx.fillStyle = "#17171f";
  ctx.beginPath();
  ctx.arc(w / 2 - h * 0.1, -h / 2, h * 0.16, 0, Math.PI * 2);
  ctx.arc(w / 2 - h * 0.1, h / 2, h * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.setLineDash([2, 2]);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(w / 2 - h * 0.28, -h / 2 + 2);
  ctx.lineTo(w / 2 - h * 0.28, h / 2 - 2);
  ctx.stroke();
  ctx.setLineDash([]);
  return { w, h };
}

// Mesmo ticket, mas "cancelado" (círculo + traço vermelho por cima, igual o
// ícone IconTicketBan) - usado pro item falso do Ticket Rush.
function drawBannedTicketShape(ctx: CanvasRenderingContext2D, size: number, color: string) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  drawTicketShape(ctx, size, color);
  ctx.restore();
  const r = size * 0.46;
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = size * 0.09;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.lineCap = "round";
  ctx.moveTo(-r * 0.7, r * 0.7);
  ctx.lineTo(r * 0.7, -r * 0.7);
  ctx.stroke();
}

// Cone de obstáculo genérico (laranja + faixas brancas) - item "ruim" do AS
// Run.
function drawConeShape(ctx: CanvasRenderingContext2D, size: number) {
  const s = size * 0.9;
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  roundRect(ctx, -s * 0.42, s * 0.34, s * 0.84, s * 0.14, s * 0.06);
  ctx.fill();
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.5);
  ctx.lineTo(s * 0.38, s * 0.4);
  ctx.lineTo(-s * 0.38, s * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(-s * 0.12, -s * 0.02);
  ctx.lineTo(s * 0.12, -s * 0.02);
  ctx.lineTo(s * 0.24, s * 0.24);
  ctx.lineTo(-s * 0.24, s * 0.24);
  ctx.closePath();
  ctx.fill();
}

function drawRunItem(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, kind: "good" | "bad", color: string) {
  ctx.save();
  ctx.translate(x, y);
  if (kind === "good") {
    drawTicketShape(ctx, size, color);
  } else {
    drawConeShape(ctx, size);
  }
  ctx.restore();
}

function drawTicketRushItem(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, kind: "valid" | "fake", color: string) {
  ctx.save();
  ctx.translate(x, y);
  if (kind === "valid") {
    drawTicketShape(ctx, size, color);
  } else {
    drawBannedTicketShape(ctx, size, color);
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function RunStage({
  config,
  onComplete,
  accent,
}: {
  config: RunConfig;
  onComplete: (result: { score: number; maxCombo: number; elapsedMs: number }) => void;
  accent: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const laneRef = useRef(1);
  const itemsRef = useRef<RunItem[]>([]);
  const scoreRef = useRef(0);
  const comboStreakRef = useRef(0);
  const maxComboRef = useRef(1);
  const livesRef = useRef(RUN_LIVES);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const finishedRef = useRef(false);
  const roadOffsetRef = useRef(0);
  const runnerPhaseRef = useRef(0);

  const [hud, setHud] = useState({ score: 0, lives: RUN_LIVES, combo: 1, timeLeft: config.durationSeconds });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    startRef.current = performance.now();
    let lastFrame = startRef.current;
    let lastSpawn = 0;
    let lastHud = 0;

    function finish() {
      if (finishedRef.current) return;
      finishedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      onComplete({
        score: Math.round(scoreRef.current),
        maxCombo: maxComboRef.current,
        elapsedMs: performance.now() - startRef.current,
      });
    }

    function draw() {
      if (!ctx) return;
      drawRoad(ctx, roadOffsetRef.current);
      itemsRef.current.forEach((item) => {
        drawRunItem(ctx, item.lane * RUN_LANE_W + RUN_LANE_W / 2, item.y, RUN_ITEM_SIZE, item.kind, accent);
      });
      const moving = livesRef.current > 0;
      drawRunner(
        ctx,
        laneRef.current * RUN_LANE_W + RUN_LANE_W / 2,
        RUN_PLAYER_Y,
        moving ? runnerPhaseRef.current : 0,
        accent
      );
    }

    function loop(now: number) {
      const elapsed = now - startRef.current;
      const dt = now - lastFrame;
      lastFrame = now;
      roadOffsetRef.current += dt * 0.09;
      runnerPhaseRef.current += dt * 0.012;

      if (elapsed >= config.durationSeconds * 1000 || livesRef.current <= 0) {
        draw();
        finish();
        return;
      }

      const progress = Math.min(1, elapsed / (config.durationSeconds * 1000));
      const spawnInterval = RUN_MAX_SPAWN_MS - (RUN_MAX_SPAWN_MS - RUN_MIN_SPAWN_MS) * progress;
      if (elapsed - lastSpawn >= spawnInterval) {
        lastSpawn = elapsed;
        itemsRef.current.push({
          lane: Math.floor(Math.random() * RUN_LANES),
          y: -RUN_ITEM_SIZE,
          kind: Math.random() < 0.7 ? "good" : "bad",
          resolved: false,
        });
      }

      itemsRef.current = itemsRef.current.filter((item) => {
        item.y += RUN_FALL_PX_PER_MS * dt;
        if (!item.resolved && Math.abs(item.y - RUN_PLAYER_Y) < RUN_ITEM_SIZE * 0.6 && item.lane === laneRef.current) {
          item.resolved = true;
          if (item.kind === "good") {
            comboStreakRef.current += 1;
            const multiplier = Math.min(RUN_MAX_COMBO, 1 + Math.floor(comboStreakRef.current / 5));
            maxComboRef.current = Math.max(maxComboRef.current, multiplier);
            scoreRef.current += RUN_POINTS_PER_ITEM * multiplier;
          } else {
            comboStreakRef.current = 0;
            livesRef.current -= 1;
          }
          return false;
        }
        return item.y < RUN_CANVAS_H + RUN_ITEM_SIZE;
      });

      draw();
      if (elapsed - lastHud >= 120) {
        lastHud = elapsed;
        const multiplier = Math.min(RUN_MAX_COMBO, 1 + Math.floor(comboStreakRef.current / 5));
        setHud({
          score: Math.round(scoreRef.current),
          lives: Math.max(0, livesRef.current),
          combo: multiplier,
          timeLeft: Math.max(0, Math.ceil(config.durationSeconds - elapsed / 1000)),
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "a") laneRef.current = Math.max(0, laneRef.current - 1);
      if (e.key === "ArrowRight" || e.key === "d") laneRef.current = Math.min(RUN_LANES - 1, laneRef.current + 1);
    }
    window.addEventListener("keydown", handleKey);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", handleKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTap(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    laneRef.current = Math.min(RUN_LANES - 1, Math.max(0, Math.floor(ratio * RUN_LANES)));
  }

  return (
    <div className="run-stage">
      <div className="run-hud">
        <span className="hud-stat">
          <IconClock size={15} /> {hud.timeLeft}s
        </span>
        <span className="hud-stat">
          <IconStar size={15} /> {hud.score}
        </span>
        <span className="hud-stat">
          <IconFlame size={15} /> x{hud.combo}
        </span>
        <span className="hud-stat">
          <IconHeart size={15} />
          {hud.lives}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={RUN_CANVAS_W}
        height={RUN_CANVAS_H}
        className="run-canvas"
        onPointerDown={handleTap}
      />
      <p className="run-hint">Setas ← → ou toque numa faixa pra mudar</p>
    </div>
  );
}

// --- Ticket Rush -----------------------------------------------------------
const TICKET_CANVAS_W = 300;
const TICKET_CANVAS_H = 460;
const TICKET_ITEM_SIZE = 40;
const TICKET_FALL_PX_PER_MS = 0.16;

interface TicketItem {
  x: number;
  y: number;
  kind: "valid" | "fake";
}

// Fundo escuro com "luzes de fila de embarque" subindo (feixes verticais
// suaves) - troca o clearRect vazio por algo com um pouco de atmosfera, sem
// competir visualmente com os tickets caindo.
function drawTicketBg(ctx: CanvasRenderingContext2D, offset: number, color: string) {
  const grad = ctx.createLinearGradient(0, 0, 0, TICKET_CANVAS_H);
  grad.addColorStop(0, "#191a2e");
  grad.addColorStop(1, "#0d0e1c");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TICKET_CANVAS_W, TICKET_CANVAS_H);

  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = color;
  const beamCount = 5;
  for (let i = 0; i < beamCount; i++) {
    const x = ((i + 0.5) / beamCount) * TICKET_CANVAS_W;
    const sway = Math.sin(offset * 0.02 + i) * 14;
    ctx.beginPath();
    ctx.moveTo(x - 26 + sway, 0);
    ctx.lineTo(x + 26 + sway, 0);
    ctx.lineTo(x + 8, TICKET_CANVAS_H);
    ctx.lineTo(x - 8, TICKET_CANVAS_H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function TicketStage({
  config,
  onComplete,
  accent,
}: {
  config: TicketConfig;
  onComplete: (result: { score: number; maxCombo: number; elapsedMs: number }) => void;
  accent: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const itemsRef = useRef<TicketItem[]>([]);
  const scoreRef = useRef(0);
  const comboStreakRef = useRef(0);
  const maxComboRef = useRef(1);
  const livesRef = useRef(TICKET_LIVES);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const finishedRef = useRef(false);

  const [hud, setHud] = useState({ score: 0, lives: TICKET_LIVES, combo: 1, timeLeft: config.durationSeconds });
  const bgOffsetRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    startRef.current = performance.now();
    let lastFrame = startRef.current;
    let lastSpawn = 0;
    let lastHud = 0;

    function finish() {
      if (finishedRef.current) return;
      finishedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      onComplete({
        score: Math.round(scoreRef.current),
        maxCombo: maxComboRef.current,
        elapsedMs: performance.now() - startRef.current,
      });
    }

    function draw() {
      if (!ctx) return;
      drawTicketBg(ctx, bgOffsetRef.current, accent);
      itemsRef.current.forEach((item) => {
        drawTicketRushItem(ctx, item.x, item.y, TICKET_ITEM_SIZE, item.kind, accent);
      });
    }

    function loop(now: number) {
      const elapsed = now - startRef.current;
      const dt = now - lastFrame;
      lastFrame = now;
      bgOffsetRef.current += dt;

      if (elapsed >= config.durationSeconds * 1000 || livesRef.current <= 0) {
        draw();
        finish();
        return;
      }

      const progress = Math.min(1, elapsed / (config.durationSeconds * 1000));
      const spawnInterval = TICKET_MAX_SPAWN_MS - (TICKET_MAX_SPAWN_MS - TICKET_MIN_SPAWN_MS) * progress;
      if (elapsed - lastSpawn >= spawnInterval) {
        lastSpawn = elapsed;
        itemsRef.current.push({
          x: TICKET_ITEM_SIZE / 2 + Math.random() * (TICKET_CANVAS_W - TICKET_ITEM_SIZE),
          y: -TICKET_ITEM_SIZE,
          kind: Math.random() < TICKET_FAKE_CHANCE ? "fake" : "valid",
        });
      }

      itemsRef.current = itemsRef.current.filter((item) => {
        item.y += TICKET_FALL_PX_PER_MS * dt;
        if (item.y >= TICKET_CANVAS_H + TICKET_ITEM_SIZE) {
          // Deixou passar sem tocar - só reseta combo se era um válido
          // (ignorar um falso é o comportamento certo, não pune isso).
          if (item.kind === "valid") comboStreakRef.current = 0;
          return false;
        }
        return true;
      });

      draw();
      if (elapsed - lastHud >= 120) {
        lastHud = elapsed;
        const multiplier = Math.min(TICKET_MAX_COMBO, 1 + Math.floor(comboStreakRef.current / 5));
        setHud({
          score: Math.round(scoreRef.current),
          lives: Math.max(0, livesRef.current),
          combo: multiplier,
          timeLeft: Math.max(0, Math.ceil(config.durationSeconds - elapsed / 1000)),
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTap(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = TICKET_CANVAS_W / rect.width;
    const scaleY = TICKET_CANVAS_H / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Acha o item caído mais próximo do toque, dentro de um raio razoável -
    // sem faixa pra "encaixar" (ao contrário do Run), o toque precisa
    // acertar perto do item de verdade.
    let hitIndex = -1;
    let hitDist = TICKET_ITEM_SIZE * 0.75;
    itemsRef.current.forEach((item, i) => {
      const dist = Math.hypot(item.x - x, item.y - y);
      if (dist < hitDist) {
        hitDist = dist;
        hitIndex = i;
      }
    });
    if (hitIndex === -1) return;

    const item = itemsRef.current[hitIndex];
    if (item.kind === "valid") {
      comboStreakRef.current += 1;
      const multiplier = Math.min(TICKET_MAX_COMBO, 1 + Math.floor(comboStreakRef.current / 5));
      maxComboRef.current = Math.max(maxComboRef.current, multiplier);
      scoreRef.current += TICKET_POINTS_PER_ITEM * multiplier;
    } else {
      comboStreakRef.current = 0;
      livesRef.current -= 1;
    }
    itemsRef.current.splice(hitIndex, 1);
  }

  return (
    <div className="ticket-stage">
      <div className="ticket-hud">
        <span className="hud-stat">
          <IconClock size={15} /> {hud.timeLeft}s
        </span>
        <span className="hud-stat">
          <IconStar size={15} /> {hud.score}
        </span>
        <span className="hud-stat">
          <IconFlame size={15} /> x{hud.combo}
        </span>
        <span className="hud-stat">
          <IconHeart size={15} />
          {hud.lives}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={TICKET_CANVAS_W}
        height={TICKET_CANVAS_H}
        className="ticket-canvas"
        onPointerDown={handleTap}
      />
      <p className="ticket-hint">
        Toque só nos tickets válidos <IconTicket size={13} className="inline-icon" /> - evite os cancelados{" "}
        <IconTicketBan size={13} className="inline-icon" />
      </p>
    </div>
  );
}

// --- Perfect Pick ----------------------------------------------------------
// Delay antes de cada rodada começar a andar - só pra dar tempo de ler
// "Rodada X" antes do marcador sair, não conta pra pontuação.
const PICK_ROUND_START_DELAY_MS = 500;

function PerfectPickStage({
  config,
  onComplete,
}: {
  config: PerfectPickConfig;
  onComplete: (rounds: { ms: number | null }[]) => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const resultsRef = useRef<{ ms: number | null }[]>([]);
  const startedAtRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedRef = useRef(false);

  const totalRounds = config.rounds;
  const durationMs = perfectPickRoundDuration(roundIndex, config);

  useEffect(() => {
    if (finishedRef.current || roundIndex >= totalRounds) return;
    setRunning(false);
    const startTimer = setTimeout(() => {
      startedAtRef.current = Date.now();
      setRunning(true);
      timeoutRef.current = setTimeout(() => {
        registerRound({ ms: null });
      }, durationMs);
    }, PICK_ROUND_START_DELAY_MS);
    return () => {
      clearTimeout(startTimer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex]);

  function registerRound(entry: { ms: number | null }) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setRunning(false);
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
    if (!running) return;
    registerRound({ ms: Date.now() - startedAtRef.current });
  }

  return (
    <div className="pick-stage">
      <p className="pick-round">
        Rodada {Math.min(roundIndex + 1, totalRounds)}/{totalRounds}
      </p>
      <div className="pick-track">
        <div className="pick-target" />
        <div
          className="pick-marker"
          style={{
            left: running ? "100%" : "0%",
            transition: running ? `left ${durationMs}ms linear` : "none",
          }}
        />
      </div>
      <button type="button" className="pick-btn" onClick={handleTap} disabled={!running}>
        {running ? "TOCAR!" : "…"}
      </button>
      <p className="pick-hint">Toque exatamente quando o marcador passar pelo centro da barra</p>
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
      .memory-stage {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.9rem;
      }
      .memory-progress {
        margin: 0;
        font-size: 0.8rem;
        opacity: 0.75;
      }
      .memory-grid {
        display: grid;
        gap: 0.5rem;
        width: 100%;
      }
      .memory-card {
        aspect-ratio: 1 / 1;
        border-radius: 0.6rem;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.08);
        font-size: 1.4rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.15s, transform 0.15s;
        color: #fff;
      }
      .memory-card:active:not(:disabled) {
        transform: scale(0.94);
      }
      .memory-card.face-up {
        background: rgba(232, 182, 70, 0.18);
        border-color: rgba(232, 182, 70, 0.4);
        cursor: default;
      }
      .memory-card.matched {
        background: rgba(22, 163, 74, 0.18);
        border-color: rgba(22, 163, 74, 0.4);
        opacity: 0.85;
      }
      .run-stage {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.6rem;
      }
      .run-hud {
        display: flex;
        justify-content: space-between;
        width: 100%;
        font-size: 0.8rem;
        font-weight: 700;
      }
      .run-canvas {
        width: 100%;
        max-width: 20rem;
        height: auto;
        border-radius: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(0, 0, 0, 0.2);
        touch-action: none;
      }
      .run-hint {
        margin: 0;
        font-size: 0.75rem;
        opacity: 0.6;
      }
      .ticket-stage {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.6rem;
      }
      .ticket-hud {
        display: flex;
        justify-content: space-between;
        width: 100%;
        font-size: 0.8rem;
        font-weight: 700;
      }
      .ticket-canvas {
        width: 100%;
        max-width: 20rem;
        height: auto;
        border-radius: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(0, 0, 0, 0.2);
        touch-action: none;
      }
      .ticket-hint {
        margin: 0;
        font-size: 0.75rem;
        opacity: 0.6;
      }
      .pick-stage {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 1rem 0 1.5rem;
        width: 100%;
      }
      .pick-round {
        margin: 0;
        font-size: 0.8rem;
        opacity: 0.7;
      }
      .pick-track {
        position: relative;
        width: 100%;
        height: 0.6rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.1);
      }
      .pick-target {
        position: absolute;
        top: 50%;
        left: calc(50% - 0.35rem);
        transform: translateY(-50%);
        width: 0.7rem;
        height: 1.6rem;
        border-radius: 0.2rem;
        background: rgba(232, 182, 70, 0.35);
        border: 1px solid rgba(232, 182, 70, 0.6);
      }
      .pick-marker {
        position: absolute;
        top: 50%;
        width: 1rem;
        height: 1rem;
        border-radius: 999px;
        background: #4f5fff;
        box-shadow: 0 0 1rem rgba(79, 95, 255, 0.6);
        transform: translate(-50%, -50%);
      }
      .pick-btn {
        width: 100%;
        background: #e8b646;
        color: #12121a;
        border: none;
        border-radius: 999px;
        padding: 0.9rem 1.3rem;
        font-weight: 800;
        font-size: 1rem;
        cursor: pointer;
      }
      .pick-btn:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .pick-hint {
        margin: 0;
        font-size: 0.8rem;
        opacity: 0.7;
        text-align: center;
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
      .result-title {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
      }
      .result-title.perfect {
        color: #fbbf24;
      }
      .inline-icon {
        display: inline-block;
        vertical-align: -0.15em;
        flex-shrink: 0;
      }
      .hud-stat {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
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
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
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
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
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
        display: flex;
        align-items: center;
        gap: 0.3rem;
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
