// AS World Adventure (hub /universo-as/arcade) - configuração das cidades e
// avaliação server-side do resultado de cada fase. Separado de lib/games.ts
// de propósito: esse jogo não é uma GamePhase de sorteio (ver comentário em
// prisma/schema.prisma::ArcadeProgress), então não usa PlayerPhaseProgress
// nem o roteamento por phase.type daquele arquivo.

import type { GameVisibility } from "@prisma/client";

// Os 4 jogos fixos do hub (ver GAMES em components/arcade/ArcadeUniverse.tsx)
// - mesmos ids usados em ArcadeGameSetting.gameId.
export const ARCADE_GAME_IDS = ["world", "maze", "blast", "run"] as const;
export type ArcadeGameId = (typeof ARCADE_GAME_IDS)[number];

export const ARCADE_GAME_NAMES: Record<ArcadeGameId, string> = {
  world: "AS World Adventure",
  maze: "AS Neon Maze",
  blast: "AS Blast Arena",
  run: "AS City Run",
};

/**
 * Mesma regra de Game.visibility (ver games/phases/[phaseId]/complete/route.ts):
 * LIVE é aberto pra todo mundo; DRAFT/TESTING só pra admin ou quem está na
 * lista de GameTester (mesma lista global usada pelos outros jogos).
 */
export function canViewArcadeGame(visibility: GameVisibility, isAdmin: boolean, isTester: boolean) {
  if (visibility === "LIVE") return true;
  return isAdmin || isTester;
}

export const CITY_ORDER = ["rio", "sao-paulo", "brasilia"] as const;
export type CityId = (typeof CITY_ORDER)[number];

export function isCityId(value: unknown): value is CityId {
  return typeof value === "string" && (CITY_ORDER as readonly string[]).includes(value);
}

export interface CityConfig {
  id: CityId;
  order: number;
  name: string;
  landmark: string;
  bossName: string;
  palette: { sky: string; accent: string };
  // Nº de moedas na fase e piso de tempo plausível pra completar - usados
  // pra clampar o que o cliente manda, mesmo raciocínio de
  // evaluateRunResult/evaluateWorldResult em lib/games.ts.
  totalCoins: number;
  minClearMs: number;
  // Tempo (ms) abaixo do qual a fase concede a 3ª estrela por velocidade.
  starTimeMs: number;
  playable: boolean; // false = cidade ainda sem fase montada (mostra "em breve")
}

export const CITIES: Record<CityId, CityConfig> = {
  rio: {
    id: "rio",
    order: 0,
    name: "Rio de Janeiro",
    landmark: "Cristo Redentor",
    bossName: "Guardião do Pão de Açúcar",
    palette: { sky: "#4fc3ff", accent: "#ffd23f" },
    totalCoins: 24,
    minClearMs: 18_000,
    starTimeMs: 45_000,
    playable: true,
  },
  "sao-paulo": {
    id: "sao-paulo",
    order: 1,
    name: "São Paulo",
    landmark: "Avenida Paulista",
    bossName: "Guardião da Paulista",
    palette: { sky: "#7c6fe0", accent: "#ff7fc8" },
    totalCoins: 24,
    minClearMs: 18_000,
    starTimeMs: 45_000,
    playable: false,
  },
  brasilia: {
    id: "brasilia",
    order: 2,
    name: "Brasília",
    landmark: "Congresso Nacional",
    bossName: "Guardião do Congresso",
    palette: { sky: "#4fe0c8", accent: "#ffe07b" },
    totalCoins: 24,
    minClearMs: 18_000,
    starTimeMs: 45_000,
    playable: false,
  },
};

export interface ArcadeOutcome {
  coins: number;
  score: number;
  elapsedMs: number;
  stars: number;
  cleared: boolean;
}

/**
 * Reprocessa o resultado mandado pelo cliente pra uma cidade. `coins` e
 * `cleared` vêm do navegador (a física do platformer não dá pra reconferir
 * no servidor, mesma limitação de AS Run/AS World - ver lib/games.ts) mas
 * são sempre clampados a um teto plausível: no máximo `totalCoins` moedas, e
 * `elapsedMs` nunca abaixo do piso configurado pra aquela cidade. Estrelas
 * são recalculadas aqui, nunca aceitas prontas do cliente.
 */
export function evaluateArcadeResult(city: CityConfig, rawCoins: unknown, rawElapsedMs: unknown, rawCleared: unknown): ArcadeOutcome {
  const cleared = rawCleared === true;
  const coins =
    typeof rawCoins === "number" && Number.isFinite(rawCoins) ? Math.max(0, Math.min(city.totalCoins, Math.round(rawCoins))) : 0;
  const elapsedMs =
    typeof rawElapsedMs === "number" && Number.isFinite(rawElapsedMs) ? Math.max(city.minClearMs, Math.round(rawElapsedMs)) : city.minClearMs * 4;

  let stars = 0;
  if (cleared) {
    stars = 1; // 1ª estrela: chegar ao fim e vencer o chefe
    if (coins >= Math.ceil(city.totalCoins * 0.7)) stars++; // 2ª: maioria das moedas
    if (elapsedMs <= city.starTimeMs) stars++; // 3ª: dentro do tempo alvo
  }

  // Pontuação: 10 por moeda + bônus fixo por limpar a fase + bônus por
  // estrela - mesma ordem de grandeza dos outros jogos do Universo AS
  // (GamePhase.points costuma ficar entre 10 e algumas centenas).
  const score = coins * 10 + (cleared ? 200 : 0) + stars * 100;

  return { coins, score, elapsedMs, stars, cleared };
}
