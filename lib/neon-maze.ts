// AS Neon Maze (hub /universo-as/arcade) - configuração dos 8 mundos (um por
// era/álbum do BTS) e avaliação server-side do resultado. Mesmo raciocínio de
// lib/arcade.ts (AS World Adventure) e lib/city-run.ts (AS City Run):
// progresso permanente por mundo, com desbloqueio sequencial - ver
// NeonMazeProgress em prisma/schema.prisma.
//
// Os ícones de inimigo/chefão/coletável e a folha "tileset" do kit recebido
// (AS_NEON_MAZE_ALBUMS_PRODUCTION_KIT_V1) não são sprites isolados de
// verdade - são recortes de um board de referência com legenda escrita em
// cima (mesmo problema já visto nos kits do World Adventure e do City Run).
// Os personagens (idle/run, já usados no World Adventure/City Run) e os
// cenários de cada mundo (backgrounds/<mundo>/layer_0N.png) são arte de
// produção de verdade e foram reaproveitados; só a camada `layer_01` de cada
// mundo veio sem conteúdo real (é só o texto "FASE N - <NOME>" num PNG
// transparente, não arte de céu) - por isso o parallax usa só as camadas
// 02 a 06. Labirintos, fantasmas e chefão são desenhados em canvas.
//
// Os 8 labirintos abaixo foram gerados por algoritmo (recursive backtracker,
// com ~10% de paredes extras derrubadas pra abrir atalhos e não ficar num
// corredor único) e validados por script antes de entrar aqui: toda célula
// aberta do grid é alcançável a partir da entrada (sem bolsão isolado,
// sempre dá pra coletar 100% dos pontinhos), a saída é a célula mais distante
// da entrada, e os covis de fantasma ficam espalhados e longe um do outro.

export const WORLD_ORDER = [
  "01_2-cool-4-skool",
  "02_love-yourself",
  "03_map-of-the-soul",
  "04_be",
  "05_proof",
  "06_dynamite",
  "07_butter",
  "08_hyyh",
] as const;
export type WorldId = (typeof WORLD_ORDER)[number];

export function isWorldId(value: unknown): value is WorldId {
  return typeof value === "string" && (WORLD_ORDER as readonly string[]).includes(value);
}

export interface WorldConfig {
  name: string;
  theme: string;
  // Cor de destaque (neon) do mundo - usada nas paredes do labirinto, no HUD
  // e no card de seleção.
  palette: string;
  grid: string[];
  cols: number;
  rows: number;
  start: [number, number];
  exit: [number, number];
  foeSpawns: [number, number][];
  dotCount: number;
  // Intervalo (ms) entre passos dos fantasmas normais / do fantasma-chefe
  // (mais rápido, só aparece depois de coletar todos os pontinhos).
  ghostMoveMs: number;
  bossMoveMs: number;
  minClearMs: number;
  starTimeMs: number;
}

const RAW_WORLDS: Record<WorldId, Omit<WorldConfig, "minClearMs" | "starTimeMs">> = {
  "01_2-cool-4-skool": {
    name: "2 Cool 4 Skool", theme: "urban-school", palette: "#ffb020",
    cols: 19, rows: 13,
    start: [1, 1], exit: [7, 7],
    foeSpawns: [[5, 1]], dotCount: 111,
    ghostMoveMs: 260, bossMoveMs: 190,
    grid: [
      "###################",
      "#...#...#.....#...#",
      "#.#.#.###.###.#.#.#",
      "#...#.......#.....#",
      "#.#####.#########.#",
      "#.....#...#.....#.#",
      "#####.###.#.###.#.#",
      "#.....#...#...#.#.#",
      "#.###########.#.#.#",
      "#.........#...#...#",
      "#.#.#####.#.###.#.#",
      "#...#.............#",
      "###################",
    ],
  },
  "02_love-yourself": {
    name: "Love Yourself", theme: "pink-city", palette: "#ff4fa3",
    cols: 21, rows: 13,
    start: [1, 1], exit: [17, 3],
    foeSpawns: [[13, 8]], dotCount: 124,
    ghostMoveMs: 250, bossMoveMs: 180,
    grid: [
      "#####################",
      "#.....#.......#.....#",
      "#.#.#.#.#####.#.###.#",
      "#.#.#...#...#.#...#.#",
      "#.#.#######.#.#####.#",
      "#.#.........#.#...#.#",
      "#.###.#.###.#.#.#.#.#",
      "#.....#.#.....#.#.#.#",
      "###.#.#.#####.#.#.#.#",
      "#...........#.#.#...#",
      "#.#####.###.#.#.###.#",
      "#.........#.....#...#",
      "#####################",
    ],
  },
  "03_map-of-the-soul": {
    name: "Map of the Soul", theme: "moon-temple", palette: "#8fb4ff",
    cols: 21, rows: 15,
    start: [1, 1], exit: [15, 13],
    foeSpawns: [[2, 11], [3, 7]], dotCount: 145,
    ghostMoveMs: 235, bossMoveMs: 165,
    grid: [
      "#####################",
      "#.........#.........#",
      "#.#######.#.#####.#.#",
      "#.......#...#...#...#",
      "#####.#.#.#.#.#.#.#.#",
      "#.....#.#.#...#.#.#.#",
      "#.#######.#####.#.#.#",
      "#...#.......#...#.#.#",
      "#.#.#.#.###.#.###.#.#",
      "#.#...#.......#.....#",
      "#.###.###.#####.###.#",
      "#.......#...#...#.#.#",
      "#######.#####.###.#.#",
      "#.............#.....#",
      "#####################",
    ],
  },
  "04_be": {
    name: "BE", theme: "cozy-room", palette: "#ffd9a0",
    cols: 23, rows: 15,
    start: [1, 1], exit: [19, 7],
    foeSpawns: [[20, 13], [15, 7]], dotCount: 159,
    ghostMoveMs: 225, bossMoveMs: 155,
    grid: [
      "#######################",
      "#...#.....#...........#",
      "###.#.###.###.#.#.###.#",
      "#.#...#.#...#...#.#...#",
      "#.###.#.###.###.#.#.###",
      "#.........#.....#...#.#",
      "###.#.###.#######.###.#",
      "#...........#.#...#...#",
      "#.###.#.###.#.#.#####.#",
      "#...#.#...#...#.#.....#",
      "###.#.###.###.#.#.#.###",
      "#...#.#.#...#.#...#...#",
      "#.###.#.###.###.#####.#",
      "#.........#...........#",
      "#######################",
    ],
  },
  "05_proof": {
    name: "Proof", theme: "silver-archive", palette: "#c7d3e0",
    cols: 23, rows: 15,
    start: [1, 1], exit: [21, 5],
    foeSpawns: [[11, 12], [5, 11]], dotCount: 159,
    ghostMoveMs: 215, bossMoveMs: 145,
    grid: [
      "#######################",
      "#.....#.........#.....#",
      "###.#.#.#.#.#####.#.#.#",
      "#.........#...#...#.#.#",
      "#.#####.###.#.#.###.###",
      "#.#.......#.#...#.#...#",
      "#.#.#####.#.#####.###.#",
      "#.#...#.............#.#",
      "#.###.#.#####.#.###.#.#",
      "#.#...#.....#.#...#.#.#",
      "#.#.#######.###.#.#.#.#",
      "#.#.#.....#.#...#.#...#",
      "#.#.#.#.###.#.###.#.#.#",
      "#...#.#.......#.....#.#",
      "#######################",
    ],
  },
  "06_dynamite": {
    name: "Dynamite", theme: "retro-disco", palette: "#b96cff",
    cols: 25, rows: 17,
    start: [1, 1], exit: [1, 15],
    foeSpawns: [[17, 7], [23, 13], [17, 13]], dotCount: 199,
    ghostMoveMs: 205, bossMoveMs: 135,
    grid: [
      "#########################",
      "#...#.....#.........#...#",
      "###.###.#.#####.###.#.#.#",
      "#.#.#...#...#...#...#.#.#",
      "#.#.#.#####.#.###.#.#.#.#",
      "#...#.#...#...#.#.#.....#",
      "#.###.#.#.#####.#.#.#.#.#",
      "#.#...#.#.......#...#.#.#",
      "#.#.###########.#.#.#.#.#",
      "#.....#.........#.......#",
      "#.###.#.#######.#####.###",
      "#.#...#.#...........#...#",
      "#.#.###.#.#######.#####.#",
      "#...#...#.#.......#.....#",
      "#####.#.###.###.#.#.###.#",
      "#.....#.......#.........#",
      "#########################",
    ],
  },
  "07_butter": {
    name: "Butter", theme: "gold-pop", palette: "#ffd52a",
    cols: 25, rows: 17,
    start: [1, 1], exit: [17, 7],
    foeSpawns: [[8, 9], [17, 15], [2, 15]], dotCount: 199,
    ghostMoveMs: 195, bossMoveMs: 125,
    grid: [
      "#########################",
      "#...#.................#.#",
      "###.#.###.###.###.#.#.#.#",
      "#.#.#.#...#...#.....#...#",
      "#.#.#.#.###.###########.#",
      "#.#.#.#.#...#.........#.#",
      "#.#.#.#.#.###.#.#####.#.#",
      "#.#...#.#.......#...#.#.#",
      "#.#.#.#.#########.#.#.#.#",
      "#...#.#.........#.#.#...#",
      "#.###.###.#.###.#.#.###.#",
      "#.#...#.....#.#.#.......#",
      "#.###.###.#.#.#.#.#####.#",
      "#...#...#.#.#.#.#.#.#...#",
      "###.###.#.#.#.#.#.#.#.#.#",
      "#.......#...#.....#.....#",
      "#########################",
    ],
  },
  "08_hyyh": {
    name: "The Most Beautiful Moment in Life", theme: "dreamy-train", palette: "#c9a6ff",
    cols: 27, rows: 17,
    start: [1, 1], exit: [17, 3],
    foeSpawns: [[15, 7], [12, 13], [13, 15]], dotCount: 216,
    ghostMoveMs: 185, bossMoveMs: 120,
    grid: [
      "###########################",
      "#.#.......#.............#.#",
      "#.#.#.###.#.#.#########.#.#",
      "#.#...#...#.#.#...#...#...#",
      "#.#.#.#.###.#.#.###.#.###.#",
      "#.#...#.....#.#.....#.#...#",
      "#.###.#######.#######.#.###",
      "#...#...#...#.....#...#.#.#",
      "###.###.#.#.#.###.#.#.#.#.#",
      "#.#...#...#...#...#.#...#.#",
      "#.###.#.#.#.###.###.#.#.#.#",
      "#.....#.........#...#.#.#.#",
      "#.#.#########.###.###.#.#.#",
      "#.#.......#...#...#...#...#",
      "#.#######.#.###.#.###.###.#",
      "#...............#.........#",
      "###########################",
    ],
  },
};

// minClearMs/starTimeMs calculados a partir do tamanho de cada labirinto
// (nº de pontinhos, ritmo mínimo plausível de ~150ms por passo) - mesmo
// raciocínio de clamp de lib/city-run.ts/lib/arcade.ts.
function withTiming(cfg: Omit<WorldConfig, "minClearMs" | "starTimeMs">): WorldConfig {
  const minClearMs = Math.round(cfg.dotCount * 150);
  const starTimeMs = Math.round(minClearMs * 1.9);
  return { ...cfg, minClearMs, starTimeMs };
}

export const WORLDS: Record<WorldId, WorldConfig> = Object.fromEntries(
  WORLD_ORDER.map((id) => [id, withTiming(RAW_WORLDS[id])])
) as Record<WorldId, WorldConfig>;

export interface NeonMazeOutcome {
  dots: number;
  score: number;
  elapsedMs: number;
  stars: number;
  cleared: boolean;
}

/**
 * Reprocessa o resultado mandado pelo cliente pra um mundo - mesmo padrão de
 * evaluateCityRunResult em lib/city-run.ts: `dots` e `cleared` vêm do
 * navegador (o labirinto roda inteiro lá, sem segredo pro servidor
 * reconferir) mas são sempre clampados a um teto plausível calculado a
 * partir do tamanho real do labirinto daquele mundo.
 */
export function evaluateNeonMazeResult(world: WorldConfig, rawDots: unknown, rawElapsedMs: unknown, rawCleared: unknown): NeonMazeOutcome {
  const cleared = rawCleared === true;
  const dots =
    typeof rawDots === "number" && Number.isFinite(rawDots) ? Math.max(0, Math.min(world.dotCount, Math.round(rawDots))) : 0;
  const elapsedMs =
    typeof rawElapsedMs === "number" && Number.isFinite(rawElapsedMs) ? Math.max(world.minClearMs, Math.round(rawElapsedMs)) : world.minClearMs * 4;

  let stars = 0;
  if (cleared) {
    stars = 1;
    if (dots >= world.dotCount) stars++; // só ganha a 2ª estrela coletando tudo
    if (elapsedMs <= world.starTimeMs) stars++;
  }

  const score = dots * 8 + (cleared ? 250 : 0) + stars * 100;

  return { dots, score, elapsedMs, stars, cleared };
}
