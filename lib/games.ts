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
