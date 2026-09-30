// AS Blast Arena (hub /universo-as/arcade) - configuração das 12 arenas e
// avaliação server-side do resultado de cada uma. Mesmo raciocínio de
// lib/city-run.ts / lib/neon-maze.ts: bombas/blocos/inimigos rodam inteiros
// no navegador (física de bomba não dá pra reconferir no servidor), mas o
// resultado reportado é sempre clampado a um teto plausível antes de virar
// pontuação/estrela - ver BlastArenaProgress em prisma/schema.prisma.
//
// O layout de blocos destrutíveis e os pontos de spawn dos inimigos de cada
// arena foram gerados por script (grade fixa de pilares indestrutíveis nos
// cruzamentos pares + blocos aleatórios com densidade crescente por arena,
// inimigos espalhados entre si e longe do início do jogador) - mesmo
// espírito do gerador de labirintos de lib/neon-maze.ts, só que sem precisar
// de validação de conectividade por BFS: os blocos aqui são destrutíveis por
// bomba, então não existe "parede" permanente capaz de isolar uma célula pra
// sempre (diferente do labirinto, onde a parede nunca cai).

export const ARENA_ORDER = [
  "01_2-cool-4-skool",
  "02_o-rul8-2",
  "03_skool-luv-affair",
  "04_dark-and-wild",
  "05_hyyh",
  "06_wings",
  "07_love-yourself",
  "08_map-of-the-soul",
  "09_be",
  "10_proof",
  "11_dynamite",
  "12_hyyh-eternal",
] as const;
export type ArenaId = (typeof ARENA_ORDER)[number];

export function isArenaId(value: unknown): value is ArenaId {
  return typeof value === "string" && (ARENA_ORDER as readonly string[]).includes(value);
}

export const COLS = 15;
export const ROWS = 9;

export interface ArenaConfig {
  id: ArenaId;
  order: number;
  name: string;
  theme: string;
  palette: string;
  // Grade fixa: "#" = pilar/borda indestrutível, "." = chão livre, "b" =
  // bloco destrutível na posição inicial. O estado real de blocos
  // vivos/quebrados, bombas e chamas fica todo em memória dentro do
  // componente do jogo (BlastArena.tsx) - isso aqui é só o ponto de partida.
  grid: string[];
  blockCount: number;
  enemyCount: number;
  enemyMoveMs: number;
  enemySpawns: [number, number][];
  minClearMs: number;
  starTimeMs: number;
}

export const ARENAS: Record<ArenaId, ArenaConfig> = {
  "01_2-cool-4-skool": {
    id: "01_2-cool-4-skool", order: 0, name: "2 Cool 4 Skool", theme: "Escola Urbana", palette: "#ffd23f",
    blockCount: 32, enemyCount: 3, enemyMoveMs: 900,
    enemySpawns: [[13, 7], [12, 5], [13, 3]],
    minClearMs: 10600, starTimeMs: 18020,
    grid: [
      "###############",
      "#....bb...b.b.#",
      "#.#b#.#b#.#b#.#",
      "#...b.b.....b.#",
      "#b#b#b#b#b#.#b#",
      "#..bbb.b...b..#",
      "#b#b#.#b#b#.#b#",
      "#b..bb...bbb..#",
      "###############",
    ],
  },
  "02_o-rul8-2": {
    id: "02_o-rul8-2", order: 1, name: "O!RUL8,2?", theme: "Pátio da Escola", palette: "#7ce7ff",
    blockCount: 32, enemyCount: 3, enemyMoveMs: 862,
    enemySpawns: [[13, 7], [11, 6], [13, 3]],
    minClearMs: 10600, starTimeMs: 18020,
    grid: [
      "###############",
      "#...b..b..bb.b#",
      "#.#.#.#b#.#.#.#",
      "#...b...b..bb.#",
      "#b#.#b#.#b#b#b#",
      "#b..b..b....bb#",
      "#b#b#.#b#b#.#b#",
      "#b.bb..bbb..b.#",
      "###############",
    ],
  },
  "03_skool-luv-affair": {
    id: "03_skool-luv-affair", order: 2, name: "Skool Luv Affair", theme: "Jardim das Cerejeiras", palette: "#ff7fc8",
    blockCount: 29, enemyCount: 4, enemyMoveMs: 824,
    enemySpawns: [[13, 7], [11, 5], [12, 3], [9, 6]],
    minClearMs: 12800, starTimeMs: 21760,
    grid: [
      "###############",
      "#...bbb....bbb#",
      "#.#.#b#.#.#.#b#",
      "#...b.....bb.b#",
      "#.#.#b#.#.#b#b#",
      "#.b....bb...bb#",
      "#.#.#.#b#.#b#.#",
      "#b...b.b.bbbb.#",
      "###############",
    ],
  },
  "04_dark-and-wild": {
    id: "04_dark-and-wild", order: 3, name: "Dark & Wild", theme: "Cidade Noturna", palette: "#8a7bff",
    blockCount: 42, enemyCount: 4, enemyMoveMs: 785,
    enemySpawns: [[13, 6], [11, 7], [13, 3], [11, 4]],
    minClearMs: 12800, starTimeMs: 21760,
    grid: [
      "###############",
      "#...b.bbbb.bbb#",
      "#.#b#.#.#.#b#b#",
      "#.bb.bbbb.bb..#",
      "#b#b#b#.#b#.#.#",
      "#bb..b.bb.b.bb#",
      "#b#b#.#.#b#b#.#",
      "#.b.b.bb.bb..b#",
      "###############",
    ],
  },
  "05_hyyh": {
    id: "05_hyyh", order: 4, name: "HYYH", theme: "Pôr do Sol", palette: "#ff9d5c",
    blockCount: 30, enemyCount: 5, enemyMoveMs: 747,
    enemySpawns: [[13, 6], [11, 5], [9, 7], [13, 2], [8, 5]],
    minClearMs: 15000, starTimeMs: 25500,
    grid: [
      "###############",
      "#..b....b..b..#",
      "#.#.#.#.#b#.#.#",
      "#bbb.bbbb.b..b#",
      "#b#.#b#.#b#.#.#",
      "#...bbbb.bb...#",
      "#.#b#b#b#.#.#.#",
      "#.....bb..bb.b#",
      "###############",
    ],
  },
  "06_wings": {
    id: "06_wings", order: 5, name: "Wings", theme: "Catedral", palette: "#c9a4ff",
    blockCount: 35, enemyCount: 5, enemyMoveMs: 709,
    enemySpawns: [[13, 5], [11, 7], [13, 2], [11, 4], [9, 5]],
    minClearMs: 15000, starTimeMs: 25500,
    grid: [
      "###############",
      "#..b.....b.b.b#",
      "#.#.#.#.#.#b#.#",
      "#bbbbbb..bb...#",
      "#b#.#.#.#b#.#b#",
      "#b....b.b..b..#",
      "#.#.#b#.#b#b#b#",
      "#b.bbbbbbbb.bb#",
      "###############",
    ],
  },
  "07_love-yourself": {
    id: "07_love-yourself", order: 6, name: "Love Yourself", theme: "Cidade Flutuante", palette: "#5cc9ff",
    blockCount: 39, enemyCount: 6, enemyMoveMs: 671,
    enemySpawns: [[13, 6], [13, 2], [9, 6], [10, 3], [11, 1], [7, 5]],
    minClearMs: 17200, starTimeMs: 29240,
    grid: [
      "###############",
      "#..bbb.bbbb.bb#",
      "#.#b#.#b#b#.#.#",
      "#..b...b...bbb#",
      "#.#b#.#.#.#b#.#",
      "#.......bbbb..#",
      "#b#b#b#.#.#b#.#",
      "#bbbbbbbbbbb.b#",
      "###############",
    ],
  },
  "08_map-of-the-soul": {
    id: "08_map-of-the-soul", order: 7, name: "Map of the Soul", theme: "Labirinto Onírico", palette: "#a06bff",
    blockCount: 38, enemyCount: 6, enemyMoveMs: 633,
    enemySpawns: [[11, 6], [13, 3], [9, 7], [12, 1], [9, 4], [7, 6]],
    minClearMs: 17200, starTimeMs: 29240,
    grid: [
      "###############",
      "#........b...b#",
      "#.#b#.#b#b#b#.#",
      "#.b.....bbb.b.#",
      "#b#.#b#b#.#b#b#",
      "#b..bbbb...bbb#",
      "#b#b#b#.#b#.#b#",
      "#b.bb..bb.bbbb#",
      "###############",
    ],
  },
  "09_be": {
    id: "09_be", order: 8, name: "BE", theme: "Apartamento", palette: "#ffb85c",
    blockCount: 45, enemyCount: 7, enemyMoveMs: 595,
    enemySpawns: [[11, 7], [13, 4], [11, 3], [7, 7], [12, 1], [9, 4], [5, 6]],
    minClearMs: 19400, starTimeMs: 32980,
    grid: [
      "###############",
      "#..b.b..b....b#",
      "#.#b#b#.#b#b#b#",
      "#bbbbb.bbbb.bb#",
      "#b#.#b#b#.#.#.#",
      "#..bbbbbbbb.bb#",
      "#b#.#.#.#b#.#b#",
      "#bbbb.b.b.b.bb#",
      "###############",
    ],
  },
  "10_proof": {
    id: "10_proof", order: 9, name: "Proof", theme: "Arena dos Cristais", palette: "#69f0b3",
    blockCount: 39, enemyCount: 7, enemyMoveMs: 556,
    enemySpawns: [[13, 7], [12, 5], [10, 7], [13, 2], [11, 3], [7, 7], [8, 5]],
    minClearMs: 19400, starTimeMs: 32980,
    grid: [
      "###############",
      "#..bbbb..b..bb#",
      "#.#b#.#.#b#.#.#",
      "#bbb..b.b.b.bb#",
      "#b#b#.#b#b#b#b#",
      "#.bb.b...b...b#",
      "#b#b#.#.#b#b#b#",
      "#b.bb....b.bb.#",
      "###############",
    ],
  },
  "11_dynamite": {
    id: "11_dynamite", order: 10, name: "Dynamite", theme: "Disco", palette: "#ff5b8a",
    blockCount: 40, enemyCount: 8, enemyMoveMs: 518,
    enemySpawns: [[13, 7], [10, 7], [13, 3], [11, 4], [12, 1], [8, 5], [6, 7], [9, 3]],
    minClearMs: 21600, starTimeMs: 36720,
    grid: [
      "###############",
      "#....bbbbb.b.b#",
      "#.#b#.#b#b#b#.#",
      "#bbbbb.bb.....#",
      "#b#b#.#b#.#.#b#",
      "#b.bb.bb.bbbbb#",
      "#.#b#b#.#b#b#.#",
      "#...bb.b....b.#",
      "###############",
    ],
  },
  "12_hyyh-eternal": {
    id: "12_hyyh-eternal", order: 11, name: "The Most Beautiful Moment in Life", theme: "Jardim Eterno", palette: "#ffd9ec",
    blockCount: 53, enemyCount: 8, enemyMoveMs: 480,
    enemySpawns: [[13, 5], [10, 7], [13, 1], [11, 3], [6, 7], [6, 3], [7, 1], [2, 5]],
    minClearMs: 21600, starTimeMs: 36720,
    grid: [
      "###############",
      "#..bbbb.bbbbb.#",
      "#.#b#.#b#b#b#b#",
      "#bb..b.bb.b.b.#",
      "#.#b#.#b#b#b#b#",
      "#b.bbbbbbbbbb.#",
      "#b#b#b#b#b#b#b#",
      "#bbbbb.b...bbb#",
      "###############",
    ],
  },
};

export interface BlastArenaOutcome {
  blocksDestroyed: number;
  enemiesDefeated: number;
  score: number;
  elapsedMs: number;
  stars: number;
  cleared: boolean;
}

/**
 * Reprocessa o resultado mandado pelo cliente pra uma arena - mesmo padrão
 * anti-fraude de evaluateCityRunResult/evaluateNeonMazeResult: os números
 * que vêm do navegador (blocos destruídos, inimigos derrotados, tempo, se
 * limpou a arena) são sempre clampados a um teto fisicamente plausível
 * calculado a partir da própria config da arena antes de virar pontuação.
 * "Limpar" a arena = derrotar todos os inimigos (estilo Bomberman clássico);
 * blocos destruídos entram só como métrica de bônus/estrela extra.
 */
export function evaluateBlastArenaResult(
  arena: ArenaConfig,
  rawBlocksDestroyed: unknown,
  rawEnemiesDefeated: unknown,
  rawElapsedMs: unknown,
  rawCleared: unknown
): BlastArenaOutcome {
  const cleared = rawCleared === true;
  const blocksDestroyed =
    typeof rawBlocksDestroyed === "number" && Number.isFinite(rawBlocksDestroyed)
      ? Math.max(0, Math.min(arena.blockCount, Math.round(rawBlocksDestroyed)))
      : 0;
  const enemiesDefeated =
    typeof rawEnemiesDefeated === "number" && Number.isFinite(rawEnemiesDefeated)
      ? Math.max(0, Math.min(arena.enemyCount, Math.round(rawEnemiesDefeated)))
      : 0;
  const elapsedMs =
    typeof rawElapsedMs === "number" && Number.isFinite(rawElapsedMs)
      ? Math.max(arena.minClearMs, Math.round(rawElapsedMs))
      : arena.minClearMs * 4;

  let stars = 0;
  if (cleared) {
    stars = 1;
    if (blocksDestroyed >= Math.ceil(arena.blockCount * 0.6)) stars++;
    if (elapsedMs <= arena.starTimeMs) stars++;
  }

  const score = enemiesDefeated * 60 + blocksDestroyed * 6 + (cleared ? 300 : 0) + stars * 100;

  return { blocksDestroyed, enemiesDefeated, score, elapsedMs, stars, cleared };
}
