// AS City Run (hub /universo-as/arcade) - configuração das rotas e avaliação
// server-side do resultado de cada rota. Mesmo raciocínio de lib/arcade.ts
// (AS World Adventure): corrida de faixas, mas com progresso permanente por
// rota em vez de sessão avulsa - ver CityRunProgress em prisma/schema.prisma.
//
// As imagens de obstáculo/ícone do kit recebido (AS_CITY_RUN_...KIT_V1) não
// são sprites isolados de verdade - são recortes de um board de referência
// com legenda escrita em cima (mesmo problema já visto no kit do World
// Adventure). Só os cards de seleção de rota (routes/<id>/route.png) são
// arte de cena de verdade, usados como pôster de cada rota. Os obstáculos e
// power-ups em jogo são formas simples desenhadas no canvas, coloridas por
// rota - ver CityRunGame.tsx.

export const ROUTE_ORDER = [
  "01_incheon",
  "02_seoul",
  "03_hyyh",
  "04_butter",
  "05_dynamite",
  "06_proof",
  "07_final-show",
] as const;
export type RouteId = (typeof ROUTE_ORDER)[number];

export function isRouteId(value: unknown): value is RouteId {
  return typeof value === "string" && (ROUTE_ORDER as readonly string[]).includes(value);
}

export type ObstacleShape = "bus" | "cone" | "drum" | "umbrella" | "barrier";

export interface RouteConfig {
  id: RouteId;
  order: number;
  name: string;
  theme: string;
  palette: { sky: string; road: string; accent: string; line: string };
  obstacleShape: ObstacleShape;
  // Distância (unidades de jogo, mesma escala do acumulador de "estrada" do
  // loop) que a pessoa precisa percorrer pra terminar a rota.
  length: number;
  // Nº de moedas esperado no percurso e piso de tempo plausível - mesmo
  // raciocínio de clamp de CityConfig em lib/arcade.ts.
  totalCoins: number;
  minClearMs: number;
  starTimeMs: number;
}

export const ROUTES: Record<RouteId, RouteConfig> = {
  "01_incheon": {
    id: "01_incheon", order: 0, name: "Incheon", theme: "Aeroporto",
    palette: { sky: "#8fd0ff", road: "#3a4a5c", accent: "#ffffff", line: "#f3f3ff" },
    obstacleShape: "bus", length: 1800, totalCoins: 18, minClearMs: 14000, starTimeMs: 22000,
  },
  "02_seoul": {
    id: "02_seoul", order: 1, name: "Seoul", theme: "Cidade",
    palette: { sky: "#6f7dc9", road: "#333d52", accent: "#ffd23f", line: "#f3f3ff" },
    obstacleShape: "cone", length: 2100, totalCoins: 21, minClearMs: 16000, starTimeMs: 25000,
  },
  "03_hyyh": {
    id: "03_hyyh", order: 2, name: "HYYH", theme: "Cerejeiras",
    palette: { sky: "#ffc9de", road: "#4a3a52", accent: "#ff7fc8", line: "#fff0f7" },
    obstacleShape: "drum", length: 2400, totalCoins: 24, minClearMs: 18000, starTimeMs: 28000,
  },
  "04_butter": {
    id: "04_butter", order: 3, name: "Butter", theme: "Praia",
    palette: { sky: "#ffe08a", road: "#4a3820", accent: "#00b4d8", line: "#fff9e0" },
    obstacleShape: "umbrella", length: 2700, totalCoins: 27, minClearMs: 20000, starTimeMs: 31000,
  },
  "05_dynamite": {
    id: "05_dynamite", order: 4, name: "Dynamite", theme: "Cidade Noturna",
    palette: { sky: "#241b4a", road: "#1c1430", accent: "#ff5b8a", line: "#c9b8ff" },
    obstacleShape: "barrier", length: 3000, totalCoins: 30, minClearMs: 22000, starTimeMs: 34000,
  },
  "06_proof": {
    id: "06_proof", order: 5, name: "Proof", theme: "Estádio",
    palette: { sky: "#3a2a5c", road: "#2a1f42", accent: "#ffd23f", line: "#e4d4ff" },
    obstacleShape: "cone", length: 3300, totalCoins: 33, minClearMs: 24000, starTimeMs: 37000,
  },
  "07_final-show": {
    id: "07_final-show", order: 6, name: "The Most Beautiful Moment", theme: "Show Final",
    palette: { sky: "#1a1030", road: "#150c26", accent: "#c890ff", line: "#e4d4ff" },
    obstacleShape: "barrier", length: 3600, totalCoins: 36, minClearMs: 26000, starTimeMs: 40000,
  },
};

export interface CityRunOutcome {
  coins: number;
  score: number;
  elapsedMs: number;
  stars: number;
  cleared: boolean;
}

/**
 * Reprocessa o resultado mandado pelo cliente pra uma rota - mesma lógica de
 * evaluateArcadeResult em lib/arcade.ts: `coins` e `cleared` vêm do
 * navegador (física do runner não dá pra reconferir no servidor) mas são
 * sempre clampados a um teto plausível.
 */
export function evaluateCityRunResult(route: RouteConfig, rawCoins: unknown, rawElapsedMs: unknown, rawCleared: unknown): CityRunOutcome {
  const cleared = rawCleared === true;
  const coins =
    typeof rawCoins === "number" && Number.isFinite(rawCoins) ? Math.max(0, Math.min(route.totalCoins, Math.round(rawCoins))) : 0;
  const elapsedMs =
    typeof rawElapsedMs === "number" && Number.isFinite(rawElapsedMs) ? Math.max(route.minClearMs, Math.round(rawElapsedMs)) : route.minClearMs * 4;

  let stars = 0;
  if (cleared) {
    stars = 1;
    if (coins >= Math.ceil(route.totalCoins * 0.7)) stars++;
    if (elapsedMs <= route.starTimeMs) stars++;
  }

  const score = coins * 10 + (cleared ? 200 : 0) + stars * 100;

  return { coins, score, elapsedMs, stars, cleared };
}
