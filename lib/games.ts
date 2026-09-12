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

// --- AS Memory (11/09) -------------------------------------------------------
//
// Jogo da memória: N pares de cartas viradas pra baixo, embaralhadas no
// próprio navegador (não precisa de seed nem verificação de servidor pra
// "qual carta é qual", porque não existe segredo nenhum sendo escondido do
// jogador - ao contrário do Purple Reaction, aqui o desafio é 100% da
// pessoa contra a própria memória, não contra tentar adivinhar algo que o
// servidor sabe e ela não. Usa o GameType.MEMORY que já existia no schema
// (não precisou de migration nova, só o componente de jogador que faltava).
export interface MemoryConfig {
  pairs: number;
  timeLimitSeconds: number; // 0 = sem limite (mas ainda usado como teto do clamp de velocidade)
}

const MEMORY_DEFAULTS: MemoryConfig = { pairs: 8, timeLimitSeconds: 0 };
const MEMORY_MIN_PAIRS = 4;
const MEMORY_MAX_PAIRS = 18;

/** Lê a config de uma fase MEMORY a partir do content (Json livre) - sempre volta um valor seguro. */
export function normalizeMemoryConfig(content: unknown): MemoryConfig {
  if (!content || typeof content !== "object") return { ...MEMORY_DEFAULTS };
  const c = content as Record<string, unknown>;
  const pairs =
    typeof c.pairs === "number"
      ? Math.min(MEMORY_MAX_PAIRS, Math.max(MEMORY_MIN_PAIRS, Math.round(c.pairs)))
      : MEMORY_DEFAULTS.pairs;
  const timeLimitSeconds =
    typeof c.timeLimitSeconds === "number" ? Math.max(0, Math.round(c.timeLimitSeconds)) : MEMORY_DEFAULTS.timeLimitSeconds;
  return { pairs, timeLimitSeconds };
}

export interface MemoryOutcome {
  moves: number; // quantas "jogadas" (virar 2 cartas) foram feitas até achar todos os pares
  pairs: number;
  percent: number;
  isPerfect: boolean; // moves === pairs, ou seja, acertou todo par de primeira
  elapsedMs: number | null;
}

// Nenhum ser humano vira 2 cartas, reconhece o par e clica de novo mais rápido
// que isso - é o mesmo papel do MIN_HUMAN_REACTION_MS lá em cima, só que por
// par de cartas em vez de por toque único.
const MIN_MS_PER_PAIR = 500;
// Ritmo "normal" de referência pra calcular o bônus de velocidade - jogar mais
// rápido que isso (por par) rende bônus, mais devagar não perde nada além do
// bônus.
const MEMORY_PAR_MS_PER_PAIR = 2200;

/**
 * Reprocessa o resultado mandado pelo cliente. `moves` e `elapsedMs` são os
 * únicos dados que vêm do navegador (não tem "resposta certa" pra conferir
 * contra o servidor, ver comentário da seção) - o cuidado aqui é só nunca
 * aceitar um tempo implausível: `elapsedMs` é sempre clampado a um mínimo de
 * `pairs * MIN_MS_PER_PAIR`, então o pior caso de manipulação é ganhar o
 * bônus de velocidade máximo, nunca um valor absurdo. Ausência de `moves`
 * nunca é tratada como "jogo perfeito" (assume um desempenho mediano em vez
 * de dar o benefício da dúvida).
 */
export function evaluateMemoryRun(rawMoves: unknown, rawElapsedMs: unknown, config: MemoryConfig): MemoryOutcome {
  const pairs = config.pairs;
  const moves =
    typeof rawMoves === "number" && Number.isFinite(rawMoves) && rawMoves >= pairs
      ? Math.round(rawMoves)
      : pairs * 3;
  const percent = Math.min(100, Math.round((pairs / moves) * 100));
  const isPerfect = moves === pairs;
  const minMs = pairs * MIN_MS_PER_PAIR;
  const elapsedMs = typeof rawElapsedMs === "number" && Number.isFinite(rawElapsedMs) ? Math.max(minMs, rawElapsedMs) : null;
  return { moves, pairs, percent, isPerfect, elapsedMs };
}

/** Classificação exibida pro jogador com base na eficiência (jogadas ÷ pares) - só cosmético. */
export function classifyMemoryTier(movesPerPair: number): string {
  if (movesPerPair <= 1) return "🥇 Perfeito";
  if (movesPerPair <= 1.25) return "🥈 Excelente";
  if (movesPerPair <= 1.6) return "🥉 Muito bom";
  if (movesPerPair <= 2.2) return "⚡ Bom";
  return "🐢 Precisa treinar";
}

/** Mesmo formato 1x-1.5x dos outros modos, baseado no tempo médio por par em vez de por rodada/fase inteira. */
export function memorySpeedMultiplier(elapsedMs: number | null, pairs: number): number {
  if (elapsedMs === null || pairs <= 0) return 1;
  const parMs = pairs * MEMORY_PAR_MS_PER_PAIR;
  const minMs = pairs * MIN_MS_PER_PAIR;
  const clamped = Math.min(parMs, Math.max(minMs, elapsedMs));
  const ratio = parMs > minMs ? 1 - (clamped - minMs) / (parMs - minMs) : 0;
  return 1 + ratio * 0.5;
}

// --- AS Run (12/09) -----------------------------------------------------
//
// Corredor de 3 faixas: a pessoa troca de faixa pra desviar de obstáculo e
// coletar item, com combo crescente. Ao contrário do Purple Reaction, aqui
// não tem "sequência esperada" nenhuma pro servidor recalcular - o próprio
// jogo (spawn de obstáculo/item, física simples de faixa) roda inteiro no
// navegador, igual qualquer corredor 2D. O que dá pra fazer, e é o que essa
// seção faz, é nunca aceitar cegamente a pontuação final: em vez disso,
// calcula um TETO plausível (quantos itens dava pra pegar, no máximo, no
// tempo que a corrida durou, jogando perfeitamente) e clampa a pontuação
// mandada a esse teto. Constantes de jogo (faixas, pontos por item, combo
// máximo, ritmo de spawn) vivem aqui pra cliente e servidor usarem
// exatamente os mesmos números.
export const RUN_LANES = 3;
export const RUN_POINTS_PER_ITEM = 10;
export const RUN_MAX_COMBO = 5;
export const RUN_LIVES = 3;
// Intervalo de spawn (ms) - começa devagar (RUN_MAX_SPAWN_MS) e vai
// acelerando até RUN_MIN_SPAWN_MS conforme a corrida avança.
export const RUN_MIN_SPAWN_MS = 450;
export const RUN_MAX_SPAWN_MS = 900;

export interface RunConfig {
  durationSeconds: number;
  targetScore: number; // pontuação "cheia" (100%) - referência pro admin ajustar por evento
}

const RUN_DEFAULTS: RunConfig = { durationSeconds: 30, targetScore: 150 };
const RUN_MIN_SECONDS = 15;
const RUN_MAX_SECONDS = 90;

/** Lê a config de uma fase RUN a partir do content (Json livre) - sempre volta um valor seguro. */
export function normalizeRunConfig(content: unknown): RunConfig {
  if (!content || typeof content !== "object") return { ...RUN_DEFAULTS };
  const c = content as Record<string, unknown>;
  const durationSeconds =
    typeof c.durationSeconds === "number"
      ? Math.min(RUN_MAX_SECONDS, Math.max(RUN_MIN_SECONDS, Math.round(c.durationSeconds)))
      : RUN_DEFAULTS.durationSeconds;
  const targetScore = typeof c.targetScore === "number" ? Math.max(10, Math.round(c.targetScore)) : RUN_DEFAULTS.targetScore;
  return { durationSeconds, targetScore };
}

export interface RunOutcome {
  score: number;
  maxCombo: number;
  percent: number;
  isPerfect: boolean;
  tier: string;
}

/**
 * Reprocessa o resultado mandado pelo cliente. `score`/`maxCombo` vêm 100%
 * do navegador (não tem como o servidor recalcular a corrida em si, ver
 * comentário da seção acima) - o cuidado é nunca aceitar um valor acima do
 * fisicamente possível: dado o tempo decorrido (sempre clampado ao limite
 * configurado da fase), calcula quantos itens dava pra pegar no MÁXIMO
 * (no ritmo mais rápido de spawn) e usa isso como teto da pontuação. O pior
 * caso de manipulação vira "ganhar a pontuação máxima plausível", nunca um
 * valor absurdo.
 */
export function evaluateRunResult(
  rawScore: unknown,
  rawMaxCombo: unknown,
  rawElapsedMs: unknown,
  config: RunConfig
): RunOutcome {
  const durationMs = config.durationSeconds * 1000;
  const elapsedMs =
    typeof rawElapsedMs === "number" && Number.isFinite(rawElapsedMs) ? Math.min(durationMs, Math.max(0, rawElapsedMs)) : durationMs;
  const maxItems = Math.ceil(elapsedMs / RUN_MIN_SPAWN_MS) + 1;
  const ceiling = maxItems * RUN_POINTS_PER_ITEM * RUN_MAX_COMBO;
  const score =
    typeof rawScore === "number" && Number.isFinite(rawScore) ? Math.max(0, Math.min(ceiling, Math.round(rawScore))) : 0;
  const maxCombo =
    typeof rawMaxCombo === "number" && Number.isFinite(rawMaxCombo)
      ? Math.max(1, Math.min(RUN_MAX_COMBO, Math.round(rawMaxCombo)))
      : 1;
  const percent = config.targetScore > 0 ? Math.min(100, Math.round((score / config.targetScore) * 100)) : 0;
  const isPerfect = percent >= 100;
  return { score, maxCombo, percent, isPerfect, tier: classifyRunTier(percent) };
}

/** Classificação exibida pro jogador com base em quanto da meta (targetScore) foi atingido - só cosmético. */
export function classifyRunTier(percent: number): string {
  if (percent >= 100) return "🥇 Show garantido";
  if (percent >= 75) return "🥈 Quase lá";
  if (percent >= 50) return "🥉 Na correria";
  if (percent >= 25) return "⚡ Aquecendo";
  return "🐢 Precisa treinar";
}
