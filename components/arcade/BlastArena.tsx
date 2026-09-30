"use client";

// AS Blast Arena - jogo top-down estilo Bomberman dentro do hub
// /universo-as/arcade (Game Universe), 12 arenas temáticas por era/álbum do
// BTS, com progresso permanente salvo no banco (ver
// prisma/schema.prisma::BlastArenaProgress e
// app/api/public/blast-arena/progress/route.ts) - mesmo padrão do AS World
// Adventure, AS City Run e AS Neon Maze.
//
// O kit recebido (AS BLAST ARENA V2 PRODUCTION KIT) tem o mesmo problema já
// visto nos outros três: bombas/inimigos/power-ups/efeitos "fatiados"
// individualmente são recortes de um board de referência com legenda escrita
// em cima (confirmado por inspeção visual, ex. bombs/bomb_01.png ainda com o
// texto "ITENS E..."/"BOMBA +1", enemies/enemy_01.png com "INIMIGOS" em
// cima), não sprites de produção de verdade. Bombas, blocos, explosões,
// inimigos e power-ups são formas simples desenhadas no canvas, coloridas
// pela paleta de cada arena (ver lib/blast-arena.ts::ARENAS.palette). As
// artes de arena (arenas/<id>/arena.webp, com o nome já gravado na imagem) e
// a versão sem legenda (arena-floor-and-obstacles.png) são arte de produção
// de verdade - a primeira vira o card de seleção, a segunda vira o pano de
// fundo atmosférico (dessaturado) atrás da grade de jogo, igual ao papel dos
// layers de paralaxe no Neon Maze. Os personagens (idle/run/hit) são os
// mesmos já usados nos outros três jogos.
//
// O layout de blocos destrutíveis e os pontos de spawn de inimigo de cada
// arena foram gerados e validados por script - ver o comentário no topo de
// lib/blast-arena.ts.

import { useEffect, useRef, useState } from "react";
import { ARENAS, ARENA_ORDER, COLS, ROWS, type ArenaId } from "@/lib/blast-arena";

type Character = { id: string; name: string; src: string };

type ArenaProgress = {
  id: ArenaId; name: string; theme: string; unlocked: boolean;
  cleared: boolean; stars: number; bestScore: number; bestTimeMs: number | null;
};

function animFrames(character: string, state: string, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const im = new Image();
    im.src = `/game-universe/animated/${character}/${state}/${state}_${String(i).padStart(2, "0")}.png`;
    return im;
  });
}
function drawSprite(ctx: CanvasRenderingContext2D, frames: HTMLImageElement[], now: number, x: number, y: number, w: number, h: number, flip: boolean, fps = 105) {
  const im = frames[Math.floor(now / fps) % frames.length];
  if (!im?.complete) return;
  if (flip) {
    ctx.save(); ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, w, h); ctx.restore();
  } else {
    ctx.drawImage(im, x, y, w, h);
  }
}
function useKeys() {
  const keys = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const d = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = true);
    const u = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = false);
    addEventListener("keydown", d);
    addEventListener("keyup", u);
    return () => { removeEventListener("keydown", d); removeEventListener("keyup", u); };
  }, []);
  return keys;
}
function bindTouch(keys: React.MutableRefObject<Record<string, boolean>>) {
  return (e: React.PointerEvent<HTMLButtonElement>) => {
    const k = e.currentTarget.dataset.k;
    if (k) keys.current[k] = e.type === "pointerdown";
  };
}
function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function sfx(name: string) {
  try { const a = new Audio(`/game-universe/audio/${name}.wav`); a.volume = 0.28; a.play().catch(() => {}); } catch {}
}

const W = 720, H = 420;
const STEP_MS = 145;
const FUSE_MS = 1900;
const BLAST_LIFE_MS = 380;
const POWERUP_CHANCE = 0.26;
const MAX_BOMBS = 3;
const MAX_RANGE = 4;

type Cell = [number, number];
type Bomb = { x: number; y: number; placedAt: number; range: number; exploded: boolean };
type Flame = { x: number; y: number; until: number };
type Enemy = { x: number; y: number; lastMove: number; alive: boolean };
type Powerup = { x: number; y: number; kind: "bomb" | "range" | "speed" };

function BlastArenaGame({ character, arena, onExit, onCleared }: { character: Character; arena: ArenaId; onExit: () => void; onCleared: (result: { blocksDestroyed: number; enemiesDefeated: number; elapsedMs: number; cleared: boolean }) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const keys = useKeys();
  const bombRef = useRef(() => {});
  const [hud, setHud] = useState({ lives: 3, bombs: 1, range: 2, enemiesLeft: 0, enemyCount: 0, elapsedMs: 0, progress: 0 });
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const cfg = ARENAS[arena];
    const tile = Math.floor(Math.min((W - 40) / COLS, (H - 40) / ROWS));
    const ox = Math.round((W - COLS * tile) / 2), oy = Math.round((H - ROWS * tile) / 2);

    const floorArt = new Image();
    floorArt.src = `/game-universe/blast-arena/${arena}/floor.png`;

    const runFrames = animFrames(character.id, "run", 3);
    const idleFrames = animFrames(character.id, "idle", 2);
    const hitFrames = animFrames(character.id, "hit", 2);

    function isPillar(x: number, y: number) {
      return x <= 0 || y <= 0 || x >= COLS - 1 || y >= ROWS - 1 || (x % 2 === 0 && y % 2 === 0);
    }
    const blocks = new Set<string>();
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (cfg.grid[y][x] === "b") blocks.add(`${x},${y}`);
    let blocksDestroyed = 0;

    let px = 1, py = 1, wantDx = 0, wantDy = 0, curDx = 0, curDy = 0, facingLeft = false;
    let lastStep = 0, lives = 3, invuln = 0, started = performance.now(), elapsedMs = 0, ended = false;
    let bombCapacity = 1, blastRange = 2, stepMs = STEP_MS;

    const enemies: Enemy[] = cfg.enemySpawns.map(([x, y]) => ({ x, y, lastMove: 0, alive: true }));
    let enemiesDefeated = 0;
    const enemyCount = cfg.enemyCount;

    let bombs: Bomb[] = [];
    let flames: Flame[] = [];
    let powerups: Powerup[] = [];

    function occupiedByBomb(x: number, y: number) {
      return bombs.some((b) => b.x === x && b.y === y);
    }
    function open(x: number, y: number) {
      if (isPillar(x, y)) return false;
      if (blocks.has(`${x},${y}`)) return false;
      if (occupiedByBomb(x, y)) return false;
      return true;
    }
    function openForEnemy(x: number, y: number) {
      return open(x, y);
    }

    function respawn() {
      px = 1; py = 1; curDx = 0; curDy = 0; invuln = 1300;
    }
    function loseLife() {
      if (invuln > 0 || ended) return;
      lives--; sfx("pickup");
      if (lives <= 0) { ended = true; onCleared({ blocksDestroyed, enemiesDefeated, elapsedMs, cleared: false }); }
      else respawn();
    }

    function detonate(bomb: Bomb, now: number) {
      if (bomb.exploded) return;
      bomb.exploded = true;
      const cells: Cell[] = [[bomb.x, bomb.y]];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        for (let n = 1; n <= bomb.range; n++) {
          const x = bomb.x + dx * n, y = bomb.y + dy * n;
          if (isPillar(x, y)) break;
          cells.push([x, y]);
          const key = `${x},${y}`;
          if (blocks.has(key)) {
            blocks.delete(key);
            blocksDestroyed++;
            if (Math.random() < POWERUP_CHANCE && !powerups.some((p) => p.x === x && p.y === y)) {
              const kinds: Powerup["kind"][] = ["bomb", "range", "speed"];
              powerups.push({ x, y, kind: kinds[Math.floor(Math.random() * kinds.length)] });
            }
            break; // bloco absorve a explosão, não passa adiante
          }
        }
      }
      for (const [x, y] of cells) flames.push({ x, y, until: now + BLAST_LIFE_MS });
      // reação em cadeia: outra bomba pega fogo já explode junto
      for (const other of bombs) {
        if (!other.exploded && cells.some(([x, y]) => x === other.x && y === other.y)) detonate(other, now);
      }
      // inimigos na área da explosão morrem
      for (const en of enemies) {
        if (en.alive && cells.some(([x, y]) => x === en.x && y === en.y)) { en.alive = false; enemiesDefeated++; }
      }
      // jogador na área da explosão toma dano
      if (cells.some(([x, y]) => x === px && y === py)) loseLife();
    }

    bombRef.current = () => {
      if (ended || pausedRef.current) return;
      if (bombs.filter((b) => !b.exploded).length >= bombCapacity) return;
      if (occupiedByBomb(px, py)) return;
      bombs.push({ x: px, y: py, placedAt: performance.now(), range: blastRange, exploded: false });
      sfx("pickup");
    };

    let raf = 0, last = performance.now();
    function loop(now: number) {
      const dtMs = now - last; last = now;
      if (ended) return;
      if (pausedRef.current) { raf = requestAnimationFrame(loop); return; }
      elapsedMs = now - started;
      if (invuln > 0) invuln -= dtMs;

      // --- movimento do jogador (grade, passo a passo, direção bufferizada) ---
      if (keys.current.arrowleft || keys.current.a) { wantDx = -1; wantDy = 0; }
      else if (keys.current.arrowright || keys.current.d) { wantDx = 1; wantDy = 0; }
      else if (keys.current.arrowup || keys.current.w) { wantDx = 0; wantDy = -1; }
      else if (keys.current.arrowdown || keys.current.s) { wantDx = 0; wantDy = 1; }
      if (now - lastStep >= stepMs) {
        if ((wantDx || wantDy) && open(px + wantDx, py + wantDy)) {
          px += wantDx; py += wantDy; curDx = wantDx; curDy = wantDy; lastStep = now;
          if (curDx !== 0) facingLeft = curDx < 0;
        }
        const pk = `${px},${py}`;
        const pu = powerups.find((p) => p.x === px && p.y === py);
        if (pu) {
          powerups = powerups.filter((p) => p !== pu);
          sfx("pickup");
          if (pu.kind === "bomb") bombCapacity = Math.min(MAX_BOMBS, bombCapacity + 1);
          else if (pu.kind === "range") blastRange = Math.min(MAX_RANGE, blastRange + 1);
          else stepMs = Math.max(95, stepMs - 12);
        }
        void pk;
      }
      if (keys.current[" "] || keys.current["enter"]) { bombRef.current(); }

      // --- bombas: explodem sozinhas quando o pavio acaba ---
      for (const b of bombs) if (!b.exploded && now - b.placedAt >= FUSE_MS) detonate(b, now);
      bombs = bombs.filter((b) => !b.exploded || now - b.placedAt < FUSE_MS + BLAST_LIFE_MS);
      flames = flames.filter((f) => f.until > now);

      // --- inimigos: perseguição heurística leve (menos agressiva que o Neon Maze - aqui o jogo é sobre posicionar bomba, não só fugir) ---
      for (const en of enemies) {
        if (!en.alive) continue;
        if (now - en.lastMove < cfg.enemyMoveMs) continue;
        const opts = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).filter(([dx, dy]) => openForEnemy(en.x + dx, en.y + dy));
        if (opts.length) {
          let pick = opts[Math.floor(Math.random() * opts.length)];
          if (Math.random() < 0.45) {
            const sorted = [...opts].sort((a, b) => Math.hypot(px - (en.x + a[0]), py - (en.y + a[1])) - Math.hypot(px - (en.x + b[0]), py - (en.y + b[1])));
            pick = sorted[0];
          }
          en.x += pick[0]; en.y += pick[1];
        }
        en.lastMove = now;
        if (en.x === px && en.y === py) loseLife();
      }
      if (ended) return;

      // --- vitória: todos os inimigos derrotados ---
      if (enemiesDefeated >= enemyCount) {
        ended = true; onCleared({ blocksDestroyed, enemiesDefeated, elapsedMs, cleared: true }); return;
      }

      setHud({
        lives, bombs: bombCapacity, range: blastRange, enemiesLeft: enemyCount - enemiesDefeated, enemyCount, elapsedMs,
        progress: Math.min(100, Math.round((enemiesDefeated / enemyCount) * 100)),
      });

      // --- desenho ---
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0a0e1e"; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.3;
      if (floorArt.complete) ctx.drawImage(floorArt, 0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(4,8,20,.62)"; ctx.fillRect(0, 0, W, H);

      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const xx = ox + x * tile, yy = oy + y * tile;
        if (isPillar(x, y)) {
          ctx.save();
          ctx.shadowColor = cfg.palette; ctx.shadowBlur = 4;
          ctx.fillStyle = "rgba(12,18,38,.94)"; ctx.fillRect(xx + 1, yy + 1, tile - 2, tile - 2);
          ctx.strokeStyle = cfg.palette; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.7;
          ctx.strokeRect(xx + 2, yy + 2, tile - 4, tile - 4);
          ctx.restore();
        } else if (blocks.has(`${x},${y}`)) {
          ctx.fillStyle = "#7a5636"; ctx.fillRect(xx + 3, yy + 3, tile - 6, tile - 6);
          ctx.fillStyle = "#a9784a"; ctx.fillRect(xx + 3, yy + 3, tile - 6, 6);
          ctx.strokeStyle = "#e0ab6e"; ctx.globalAlpha = 0.6; ctx.strokeRect(xx + 5, yy + 5, tile - 10, tile - 10);
          ctx.globalAlpha = 1;
        }
      }
      for (const p of powerups) {
        const xx = ox + p.x * tile + tile / 2, yy = oy + p.y * tile + tile / 2;
        const color = p.kind === "bomb" ? "#ff9d5c" : p.kind === "range" ? "#69f0b3" : "#7ce7ff";
        ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 10;
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(xx, yy, tile * 0.22, 0, 7); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = "#0a0e1e"; ctx.font = `${Math.round(tile * 0.28)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(p.kind === "bomb" ? "+" : p.kind === "range" ? "»" : "⚡", xx, yy + 1);
        ctx.restore();
      }
      for (const b of bombs) {
        if (b.exploded) continue;
        const xx = ox + b.x * tile + tile / 2, yy = oy + b.y * tile + tile / 2;
        const pulse = (now - b.placedAt) / FUSE_MS;
        const r = tile * (0.26 + Math.sin(now / (80 - pulse * 40)) * 0.03);
        ctx.save(); ctx.shadowColor = "#ffb32d"; ctx.shadowBlur = 8 + pulse * 10;
        ctx.fillStyle = "#0a0a12"; ctx.beginPath(); ctx.arc(xx, yy, r, 0, 7); ctx.fill();
        ctx.strokeStyle = pulse > 0.7 ? "#ff5b5b" : "#3a3a4a"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#ffb32d"; ctx.fillRect(xx + r * 0.5, yy - r - 6, 3, 8);
        ctx.restore();
      }
      for (const f of flames) {
        const xx = ox + f.x * tile, yy = oy + f.y * tile;
        const life = Math.max(0, (f.until - now) / BLAST_LIFE_MS);
        ctx.save(); ctx.globalAlpha = 0.55 + life * 0.4;
        ctx.fillStyle = "#ffb000"; ctx.fillRect(xx + 3, yy + 3, tile - 6, tile - 6);
        ctx.fillStyle = "#fff26b"; ctx.fillRect(xx + tile * 0.22, yy + tile * 0.22, tile * 0.56, tile * 0.56);
        ctx.restore();
      }
      for (const en of enemies) {
        if (!en.alive) continue;
        const fx = ox + en.x * tile + tile / 2, fy = oy + en.y * tile + tile / 2;
        ctx.save(); ctx.translate(fx, fy);
        ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
        ctx.fillStyle = "#ff8fae";
        ctx.beginPath(); ctx.arc(0, -2, tile * 0.3, Math.PI, 0);
        ctx.lineTo(tile * 0.3, tile * 0.26);
        for (let i = 3; i >= 0; i--) ctx.lineTo(tile * 0.3 * (i / 4 - 0.375) * 2, tile * (i % 2 ? 0.26 : 0.34));
        ctx.lineTo(-tile * 0.3, tile * 0.26); ctx.closePath(); ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.fillStyle = "#2a0b18"; ctx.beginPath(); ctx.arc(-tile * 0.11, -4, tile * 0.075, 0, 7); ctx.arc(tile * 0.11, -4, tile * 0.075, 0, 7); ctx.fill();
        ctx.restore();
      }
      const state = invuln > 0 ? hitFrames : (curDx || curDy) ? runFrames : idleFrames;
      ctx.globalAlpha = invuln > 0 ? (Math.floor(now / 90) % 2 ? 0.4 : 1) : 1;
      drawSprite(ctx, state, now, ox + px * tile + tile * 0.06, oy + py * tile - tile * 0.1, tile * 0.88, tile * 1.02, facingLeft);
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [character.id, arena]);

  const touch = bindTouch(keys);
  const cfg = ARENAS[arena];
  return (
    <div className="ba-play">
      <div className="ba-hud">
        <span className="ba-brand"><b>AS</b><em>BRASIL</em></span>
        <span className="ba-hud-item ba-lives">{Array.from({ length: hud.lives }, () => "❤").join("")}</span>
        <span className="ba-hud-item">💣 <b>{hud.bombs}</b></span>
        <span className="ba-hud-item">✹ <b>{hud.range}</b></span>
        <span className="ba-hud-item">👾 <b>{hud.enemiesLeft}/{hud.enemyCount}</b></span>
        <span className="ba-hud-item">⏱ <b>{fmtTime(hud.elapsedMs)}</b></span>
        <button className="ba-pause" onClick={() => setPaused((p) => !p)}>{paused ? "▶" : "⏸"}</button>
      </div>
      <div className="ba-stage">
        <strong>ARENA {ARENA_ORDER.indexOf(arena) + 1}</strong><span>{cfg.name.toUpperCase()}</span>
        <div className="ba-stage-track"><i style={{ width: `${hud.progress}%` }} /></div>
      </div>
      <div className="canvas-wrap"><canvas ref={ref} width={W} height={H} /></div>
      {paused && (
        <div className="ba-overlay">
          <h3>Pausado</h3>
          <button onClick={() => setPaused(false)}>Continuar</button>
          <button onClick={onExit}>Sair pra seleção</button>
        </div>
      )}
      <div className="mobile-controls ba-dpad">
        <button data-k="arrowleft" onPointerDown={touch} onPointerUp={touch}>◀</button>
        <div className="ba-dpad-col">
          <button data-k="arrowup" onPointerDown={touch} onPointerUp={touch}>▲</button>
          <button data-k="arrowdown" onPointerDown={touch} onPointerUp={touch}>▼</button>
        </div>
        <button data-k="arrowright" onPointerDown={touch} onPointerUp={touch}>▶</button>
      </div>
      <button className="ba-bomb-btn" onPointerDown={() => bombRef.current()}>💣</button>
    </div>
  );
}

// --- Componente principal: seleção de arena + resultado --------------------

export function BlastArena({ character, onFinish }: { character: Character; onFinish: (score: number) => void }) {
  const [arenas, setArenas] = useState<ArenaProgress[] | null>(null);
  const [active, setActive] = useState<ArenaId | null>(null);
  const [result, setResult] = useState<{ arena: ArenaId; cleared: boolean; stars: number; blocksDestroyed: number; enemiesDefeated: number } | null>(null);

  function loadProgress() {
    fetch("/api/public/blast-arena/progress")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setArenas(data?.arenas ?? defaultArenas()))
      .catch(() => setArenas(defaultArenas()));
  }
  useEffect(loadProgress, []);

  function defaultArenas(): ArenaProgress[] {
    return ARENA_ORDER.map((id, i) => ({ id, name: ARENAS[id].name, theme: ARENAS[id].theme, unlocked: i === 0, cleared: false, stars: 0, bestScore: 0, bestTimeMs: null }));
  }

  async function handleCleared(arena: ArenaId, r: { blocksDestroyed: number; enemiesDefeated: number; elapsedMs: number; cleared: boolean }) {
    let stars = 0;
    try {
      const res = await fetch("/api/public/blast-arena/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arena, blocksDestroyed: r.blocksDestroyed, enemiesDefeated: r.enemiesDefeated, elapsedMs: r.elapsedMs, cleared: r.cleared }),
      });
      if (res.ok) { const data = await res.json(); stars = data.stars ?? 0; onFinish(data.bestScore ?? 0); }
    } catch {}
    setResult({ arena, cleared: r.cleared, stars, blocksDestroyed: r.blocksDestroyed, enemiesDefeated: r.enemiesDefeated });
    setActive(null);
    loadProgress();
  }

  if (active) {
    return (
      <>
        <BlastArenaGame character={character} arena={active} onExit={() => setActive(null)} onCleared={(r) => handleCleared(active, r)} />
        <BlastArenaStyles />
      </>
    );
  }

  if (result) {
    const meta = ARENAS[result.arena];
    return (
      <div className="ba-result">
        <h2>{result.cleared ? `${meta.name} concluída!` : "A arena venceu dessa vez"}</h2>
        {result.cleared && <div className="ba-stars">{"⭐".repeat(result.stars)}{"☆".repeat(3 - result.stars)}</div>}
        <p>👾 {result.enemiesDefeated} inimigos derrotados</p>
        <div className="ba-result-actions">
          <button onClick={() => { setResult(null); setActive(result.arena); }}>Jogar de novo</button>
          <button onClick={() => setResult(null)}>Voltar pra seleção</button>
        </div>
        <BlastArenaStyles />
      </div>
    );
  }

  return (
    <div className="ba-select">
      <p className="ba-hint">Escolha uma arena pra explodir com {character.name}</p>
      <div className="ba-arenas">
        {(arenas ?? defaultArenas()).map((a) => {
          const meta = ARENAS[a.id];
          const locked = !a.unlocked;
          return (
            <button
              key={a.id}
              className={`ba-arena ${locked ? "locked" : ""}`}
              style={{ backgroundImage: `url(/game-universe/blast-arena/${a.id}/arena.webp)` }}
              disabled={locked}
              onClick={() => setActive(a.id)}
            >
              <div className="ba-arena-shade" />
              <div className="ba-arena-body">
                <strong>{meta.name}</strong>
                {a.cleared && <div className="ba-stars small">{"⭐".repeat(a.stars)}{"☆".repeat(3 - a.stars)}</div>}
                {locked && <span className="ba-lock">🔒 Complete a arena anterior</span>}
                {!locked && <span className="ba-go">EXPLODIR →</span>}
              </div>
            </button>
          );
        })}
      </div>
      <BlastArenaStyles />
    </div>
  );
}

function BlastArenaStyles() {
  return (
    <style jsx global>{`
      .ba-hint{color:#b9c3df;text-align:center;margin:4px 0 16px}
      .ba-arenas{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;max-width:1000px;margin:0 auto}
      .ba-arena{position:relative;height:160px;border-radius:16px;border:1px solid #2c3a62;background-size:cover;background-position:center;overflow:hidden;cursor:pointer;padding:0}
      .ba-arena:disabled{cursor:not-allowed}
      .ba-arena-shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,#0009 100%)}
      .ba-arena.locked .ba-arena-shade{background:#000a}
      .ba-arena-body{position:absolute;left:0;right:0;bottom:0;padding:10px;display:flex;flex-direction:column;gap:2px;text-align:left;color:#fff}
      .ba-arena-body strong{font-size:13px;line-height:1.2}
      .ba-lock{font-size:10px;color:#ffd23f;margin-top:4px}
      .ba-go{font-size:10px;color:#ff9d5c;margin-top:4px;font-weight:700}
      .ba-stars{font-size:15px;color:#ffd52a}
      .ba-stars.small{font-size:12px}
      .ba-result{max-width:420px;margin:40px auto;text-align:center;color:#fff}
      .ba-result-actions{display:flex;gap:10px;justify-content:center;margin-top:16px}
      .ba-result-actions button{background:#172341;border:1px solid #405180;color:#fff;border-radius:12px;padding:10px 16px;font-weight:700}
      .arcade-shell:has(.ba-play){padding:0!important;overflow:hidden;background:#0a0e1e;min-height:100dvh}
      .arcade-shell:has(.ba-play) .game-head{position:fixed;z-index:40;top:14px;left:14px;right:14px;max-width:none;margin:0;pointer-events:none}
      .arcade-shell:has(.ba-play) .game-head button{pointer-events:auto;background:rgba(10,14,30,.62);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(14px);box-shadow:0 8px 30px #0005}
      .arcade-shell:has(.ba-play) .game-head div{display:none}
      .arcade-shell:has(.ba-play) .game-head img{margin-left:auto;width:48px;height:48px;padding:5px;border-radius:16px;background:rgba(10,14,30,.58);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(14px)}
      .ba-play{position:relative;width:100vw;height:100dvh;overflow:hidden;background:radial-gradient(circle at 50% 30%,#3a2a1c 0%,#170f38 48%,#0a0e1e 100%);display:flex;align-items:center;justify-content:center}
      .ba-play .canvas-wrap{position:relative;width:min(100vw,calc(100dvh * 12 / 7));height:min(100dvh,calc(100vw * 7 / 12));padding:0!important;border:0!important;border-radius:16px!important;background:#0a0e1e!important;overflow:hidden;box-shadow:0 0 0 2px rgba(255,157,92,.5),0 0 46px 8px rgba(255,91,90,.28),0 30px 80px rgba(0,0,0,.55)!important}
      .ba-play .canvas-wrap canvas{display:block;width:100%!important;height:100%!important;max-height:none!important;object-fit:fill!important;border-radius:inherit!important}
      .ba-play .ba-hud{position:absolute;z-index:12;top:16px;left:16px;display:flex;align-items:center;gap:7px;padding:7px 9px;background:linear-gradient(180deg,rgba(45,20,10,.92),rgba(20,10,20,.86));border:1px solid rgba(255,157,92,.36);border-radius:13px;backdrop-filter:blur(14px);box-shadow:0 12px 34px #0007,inset 0 1px #ffffff16;max-width:calc(100vw - 32px);flex-wrap:wrap}
      .ba-brand{display:flex;align-items:center;gap:6px;padding:3px 9px 3px 4px;border-right:1px solid #ffffff24;color:#fff}
      .ba-brand b{display:grid;place-items:center;width:32px;height:26px;border-radius:7px;background:#fff;color:#092441;font-size:14px;font-style:italic}
      .ba-brand em{font-size:11px;font-weight:900;font-style:normal;letter-spacing:.7px}
      .ba-hud-item{color:#fff;font-weight:700;font-size:12px;line-height:1;padding:7px 8px;border-radius:8px;background:rgba(255,255,255,.055);text-shadow:0 2px 8px #000;white-space:nowrap}
      .ba-lives{color:#ff5f93;letter-spacing:1px}
      .ba-pause{margin-left:0;width:32px;height:32px;background:#8a3a1c;border:1px solid rgba(255,157,92,.4);color:#fff;border-radius:8px;display:grid;place-items:center}
      .ba-stage{position:absolute;z-index:12;top:16px;right:16px;width:190px;padding:8px 10px;border-radius:12px;background:linear-gradient(180deg,rgba(45,20,10,.9),rgba(20,10,20,.82));border:1px solid rgba(255,157,92,.3);backdrop-filter:blur(12px);box-shadow:0 10px 30px #0005;color:#fff}
      .ba-stage strong{font-size:10px;color:#ff9d5c;letter-spacing:1px;margin-right:6px}
      .ba-stage span{font-size:10px;font-weight:900;letter-spacing:.5px}
      .ba-stage-track{height:4px;margin-top:6px;background:rgba(255,255,255,.11);border-radius:99px;overflow:hidden}
      .ba-stage-track i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#ff9d5c,#ff5b8a);box-shadow:0 0 9px #ff8a5c}
      .ba-play .mobile-controls.ba-dpad{position:absolute;z-index:14;left:18px;right:auto;bottom:max(18px,env(safe-area-inset-bottom));display:flex;align-items:center;gap:10px;margin:0}
      .ba-dpad-col{display:flex;flex-direction:column;gap:8px}
      .ba-play .ba-dpad button{min-width:56px;min-height:50px;border:1px solid rgba(255,255,255,.24);background:rgba(10,14,30,.48);color:#fff;border-radius:16px;font-weight:900;backdrop-filter:blur(12px);box-shadow:0 10px 30px #0005;text-shadow:0 2px 8px #000}
      .ba-play .ba-dpad button:active{transform:scale(.94);background:rgba(255,120,80,.62)}
      .ba-bomb-btn{position:absolute;z-index:14;right:18px;bottom:max(18px,env(safe-area-inset-bottom));width:68px;height:68px;border-radius:50%;border:1px solid rgba(255,255,255,.28);background:radial-gradient(circle at 35% 30%,#ff9d5c,#8a2f1c);color:#fff;font-size:26px;box-shadow:0 10px 30px #0007;backdrop-filter:blur(10px)}
      .ba-bomb-btn:active{transform:scale(.92)}
      .ba-overlay{position:absolute;z-index:30;inset:0;background:rgba(10,6,4,.72);backdrop-filter:blur(12px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff;border-radius:0}
      .ba-overlay button{background:#172341;border:1px solid #405180;color:#fff;border-radius:12px;padding:10px 18px;font-weight:700}
      @media(max-width:720px){
        .ba-arenas{grid-template-columns:repeat(2,1fr)}
        .arcade-shell:has(.ba-play) .game-head{top:8px;left:8px;right:8px}
        .arcade-shell:has(.ba-play) .game-head img{display:none}
        .ba-play .ba-hud{top:8px;left:8px;gap:3px;padding:4px;max-width:calc(100vw - 16px)}
        .ba-brand em{display:none}
        .ba-brand{padding-right:4px}
        .ba-brand b{width:28px;height:25px}
        .ba-hud-item{font-size:10px;padding:6px 5px}
        .ba-stage{top:78px;right:8px;width:145px;padding:6px 8px}
        .ba-stage span{font-size:9px}
        .ba-play .mobile-controls.ba-dpad{left:10px;bottom:max(10px,env(safe-area-inset-bottom))}
        .ba-bomb-btn{right:10px;bottom:max(10px,env(safe-area-inset-bottom));width:60px;height:60px;font-size:22px}
      }
    `}</style>
  );
}
