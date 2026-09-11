export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

/**
 * O conteúdo de uma GamePhase é um Json livre. A primeira versão do editor
 * de admin guardava uma pergunta só ({question, options, correctIndex}); a
 * versão atual guarda várias ({questions: [...]}), pra dar pra medir
 * "aproveitamento" em porcentagem de verdade. Qualquer fase criada antes
 * dessa mudança continua funcionando - vira só um questionário de uma
 * pergunta.
 */
export function normalizeQuizQuestions(content: unknown): QuizQuestion[] {
  if (!content || typeof content !== "object") return [];
  const c = content as Record<string, unknown>;

  if (Array.isArray(c.questions)) {
    return (c.questions as unknown[])
      .map((q) => {
        if (!q || typeof q !== "object") return null;
        const qq = q as Record<string, unknown>;
        if (typeof qq.question !== "string" || !Array.isArray(qq.options)) return null;
        return {
          question: qq.question,
          options: (qq.options as unknown[]).map((o) => String(o)),
          correctIndex: typeof qq.correctIndex === "number" ? qq.correctIndex : 0,
        };
      })
      .filter((q): q is QuizQuestion => q !== null);
  }

  // Formato antigo: pergunta única direto na raiz do content.
  if (typeof c.question === "string" && Array.isArray(c.options)) {
    return [
      {
        question: c.question,
        options: (c.options as unknown[]).map((o) => String(o)),
        correctIndex: typeof c.correctIndex === "number" ? c.correctIndex : 0,
      },
    ];
  }

  return [];
}

/** Remove a resposta certa antes de mandar a fase pro navegador do participante. */
export function stripCorrectAnswers(questions: QuizQuestion[]) {
  return questions.map((q) => ({ question: q.question, options: q.options }));
}

// --- Modo Rush (11/09) ------------------------------------------------------
//
// "Quiz Rush" não é um GameType novo nem exige migration nenhuma - é um modo
// ligado por jogo, guardado dentro do próprio `Game.theme` (JSON livre que já
// existia pras cores/imagem de fundo). Isso deixa o jogo inteiro (todas as
// fases) cronometrado, com bônus de pontuação por velocidade quando a pessoa
// acerta tudo - sem tocar em schema, então dá pra construir e validar 100%
// no sandbox mesmo sem conseguir rodar `prisma generate` aqui hoje.
export interface RushConfig {
  enabled: boolean;
  timeLimitSeconds: number;
}

const RUSH_MIN_SECONDS = 3;
const RUSH_MAX_SECONDS = 60;
const RUSH_DEFAULT_SECONDS = 8;

/** Lê a config de rush a partir do `Game.theme` (JSON livre) - nunca falha, sempre volta um valor seguro. */
export function getRushConfig(theme: unknown): RushConfig {
  if (!theme || typeof theme !== "object") return { enabled: false, timeLimitSeconds: RUSH_DEFAULT_SECONDS };
  const t = theme as Record<string, unknown>;
  const enabled = t.rushMode === true;
  const raw = typeof t.rushTimeLimitSeconds === "number" ? t.rushTimeLimitSeconds : RUSH_DEFAULT_SECONDS;
  const timeLimitSeconds = Math.min(RUSH_MAX_SECONDS, Math.max(RUSH_MIN_SECONDS, Math.round(raw)));
  return { enabled, timeLimitSeconds };
}

/**
 * Multiplicador de pontuação por velocidade (1x a 1.5x) - só entra em jogo
 * quando a fase foi 100% acertada (nunca "salva" uma resposta errada por ter
 * sido rápida). `elapsedMs` vem do cliente mas é sempre clampado aqui dentro
 * do limite de tempo da fase, então o pior que dá pra manipular é ganhar o
 * bônus máximo (1.5x) mandando um valor bem baixo - nunca inflar além disso,
 * e nunca afeta se a fase foi "perfeita" (isso continua 100% servidor).
 */
export function speedMultiplier(elapsedMs: unknown, timeLimitSeconds: number): number {
  const timeLimitMs = timeLimitSeconds * 1000;
  const raw = typeof elapsedMs === "number" && Number.isFinite(elapsedMs) ? elapsedMs : timeLimitMs;
  const clamped = Math.min(Math.max(raw, 0), timeLimitMs);
  const speedRatio = timeLimitMs > 0 ? 1 - clamped / timeLimitMs : 0;
  return 1 + speedRatio * 0.5;
}

// --- Purple Reaction (11/09) -------------------------------------------------
//
// Jogo de tempo de reação: N rodadas, cada uma mostra um alvo (às vezes um
// "chamariz"/decoy que NÃO deve ser tocado) depois de um atraso aleatório.
// Ao contrário do Modo Rush (que ajusta a pontuação de um quiz já existente),
// esse é um GameType novo de verdade (`REACTION`), porque o formato de
// conteúdo/jogo é completamente diferente de pergunta+alternativas - por
// isso a migration que adiciona esse valor ao enum (ver
// prisma/migrations/20260911120000_game_type_reaction).
export interface ReactionConfig {
  rounds: number;
  minDelayMs: number;
  maxDelayMs: number;
  decoyChance: number; // 0 a 1
}

const REACTION_DEFAULTS: ReactionConfig = {
  rounds: 5,
  minDelayMs: 1000,
  maxDelayMs: 3000,
  decoyChance: 0.25,
};

/** Lê a config de uma fase REACTION a partir do content (Json livre) - sempre volta um valor seguro. */
export function normalizeReactionConfig(content: unknown): ReactionConfig {
  if (!content || typeof content !== "object") return { ...REACTION_DEFAULTS };
  const c = content as Record<string, unknown>;
  const rounds = typeof c.rounds === "number" ? Math.min(15, Math.max(3, Math.round(c.rounds))) : REACTION_DEFAULTS.rounds;
  const minDelayMs = typeof c.minDelayMs === "number" ? Math.max(300, Math.round(c.minDelayMs)) : REACTION_DEFAULTS.minDelayMs;
  const maxDelayMsRaw = typeof c.maxDelayMs === "number" ? Math.round(c.maxDelayMs) : REACTION_DEFAULTS.maxDelayMs;
  const maxDelayMs = Math.max(minDelayMs + 200, maxDelayMsRaw);
  const decoyChance =
    typeof c.decoyChance === "number" ? Math.min(0.6, Math.max(0, c.decoyChance)) : REACTION_DEFAULTS.decoyChance;
  return { rounds, minDelayMs, maxDelayMs, decoyChance };
}

export interface ReactionRoundResult {
  tapped: boolean;
  ms: number | null; // só faz sentido quando a rodada não era decoy && tapped
}

export interface ReactionOutcome {
  correctCount: number;
  total: number;
  percent: number;
  isPerfect: boolean;
  avgMs: number | null; // média dos alvos reais acertados, null se nenhum
  tier: string;
}

const MIN_HUMAN_REACTION_MS = 80; // abaixo disso é fisicamente implausível pra um toque real
const MAX_REACTION_WINDOW_MS = 3000; // teto de clamp pra qualquer valor mandado pelo cliente

/**
 * Gera a sequência de "essa rodada é chamariz?" de forma determinística a
 * partir de uma seed (usamos o id da fase) - o MESMO cálculo roda no
 * navegador (pra decidir o que mostrar em cada rodada) e aqui no servidor
 * (pra conferir depois). Isso fecha a brecha óbvia de um jogador mandar
 * `isDecoy: true` fabricado pra toda rodada e "acertar" tudo sem jogar -
 * o servidor nunca mais confia no que o cliente diz que era decoy, só no que
 * ele mesmo recalcula. PRNG simples (mulberry32) só precisa ser estável, não
 * criptograficamente forte - ninguém ganha nada escondendo o padrão, já que
 * ele decide só o que aparece na tela, não o tempo de reação em si.
 */
export function generateReactionSequence(seedKey: string, config: ReactionConfig): boolean[] {
  let h = 2166136261;
  for (let i = 0; i < seedKey.length; i++) {
    h ^= seedKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const seq: boolean[] = [];
  for (let i = 0; i < config.rounds; i++) seq.push(next() < config.decoyChance);
  return seq;
}

/**
 * Reprocessa as rodadas mandadas pelo cliente e decide o resultado. O
 * "isDecoy" de cada rodada vem de `expectedIsDecoy` (recalculado aqui no
 * servidor via generateReactionSequence, nunca do que o cliente mandar) - só
 * `tapped`/`ms` vêm do corpo da requisição, e `ms` é sempre clampado pra uma
 * janela humana plausível, então o pior caso de manipulação é "ganhar a
 * pontuação máxima", nunca um valor absurdo nem uma rodada inventada a mais.
 */
export function evaluateReactionRounds(
  rounds: unknown,
  config: ReactionConfig,
  expectedIsDecoy: boolean[]
): ReactionOutcome {
  const list = Array.isArray(rounds) ? rounds.slice(0, config.rounds) : [];
  const total = config.rounds;

  let correctCount = 0;
  let sumMs = 0;
  let countMs = 0;

  for (let i = 0; i < total; i++) {
    const isDecoy = expectedIsDecoy[i] ?? false;
    const r = list[i];
    const rr = r && typeof r === "object" ? (r as Record<string, unknown>) : {};
    const tapped = rr.tapped === true;
    const rawMs = typeof rr.ms === "number" && Number.isFinite(rr.ms) ? rr.ms : null;

    if (isDecoy) {
      // Acerto num decoy é NÃO tocar - tocar é erro (impulsivo).
      if (!tapped) correctCount++;
      continue;
    }

    if (tapped && rawMs !== null) {
      const clamped = Math.min(MAX_REACTION_WINDOW_MS, Math.max(MIN_HUMAN_REACTION_MS, rawMs));
      correctCount++;
      sumMs += clamped;
      countMs++;
    }
    // não tocou um alvo real (ou tocou sem tempo registrado) = errou essa rodada.
  }

  const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const isPerfect = total > 0 && correctCount === total;
  const avgMs = countMs > 0 ? Math.round(sumMs / countMs) : null;

  return { correctCount, total, percent, isPerfect, avgMs, tier: classifyReactionTier(avgMs) };
}

/** Classificação exibida pro jogador - só cosmético, não afeta pontuação além do multiplicador de velocidade. */
export function classifyReactionTier(avgMs: number | null): string {
  if (avgMs === null) return "🐢 Precisa treinar";
  if (avgMs < 200) return "🥇 Lendário";
  if (avgMs < 280) return "🥈 Elite";
  if (avgMs < 380) return "🥉 Rápido";
  if (avgMs < 500) return "⚡ Normal";
  return "🐢 Precisa treinar";
}

/** Mesmo formato 1x-1.5x do Modo Rush, só que baseado no tempo médio de reação em vez de um cronômetro por fase. */
export function reactionSpeedMultiplier(avgMs: number | null): number {
  if (avgMs === null) return 1;
  const ratio = 1 - Math.min(1, Math.max(0, (avgMs - MIN_HUMAN_REACTION_MS) / (500 - MIN_HUMAN_REACTION_MS)));
  return 1 + ratio * 0.5;
}
