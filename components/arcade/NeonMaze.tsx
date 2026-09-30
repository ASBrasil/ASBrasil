"use client";

// AS Neon Maze - labirinto top-down dentro do hub /universo-as/arcade (Game
// Universe), 8 mundos temáticos por era/álbum do BTS, com progresso
// permanente salvo no banco (ver prisma/schema.prisma::NeonMazeProgress e
// app/api/public/neon-maze/progress/route.ts) - mesmo padrão do AS World
// Adventure (components/arcade/WorldAdventure.tsx) e do AS City Run
// (components/arcade/CityRun.tsx).
//
// Os ícones de inimigo/chefão/coletável e a folha "tileset" do kit recebido
// (AS_NEON_MAZE_ALBUMS_PRODUCTION_KIT_V1) são recortes de um board de
// referência com legenda escrita em cima, não sprites isolados de verdade
// (mesmo problema já visto nos kits do World Adventure e do City Run - ver
// claude/pendencias-sorteios.md). Paredes, fantasmas, chefão e pontinhos são
// formas simples desenhadas no canvas, com neon colorido por mundo (ver
// lib/neon-maze.ts::WORLDS.palette). Os cenários (backgrounds/<mundo>/
// layer_0N.png) e os personagens (idle/run, reaproveitados do World
// Adventure/City Run) são arte de produção de verdade - usados como pano de
// fundo atmosférico atrás da grade do labirinto. Os cards de seleção de
// mundo usam background_full.webp (arte de capa, com o nome do mundo já
// gravado na própria imagem).
//
// Os 8 labirintos em si (WORLDS[...].grid) foram gerados por algoritmo e
// validados por script antes de entrar em lib/neon-maze.ts - ver o
// comentário lá em cima pro detalhe.

import { useEffect, useRef, useState } from "react";
import { WORLD_ORDER, WORLDS, type WorldId } from "@/lib/neon-maze";

type Character = { id: string; name: string; src: string };

type WorldProgress = {
  id: WorldId; name: string; theme: string; unlocked: boolean;
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
const STEP_MS = 150;

type Foe = { x: number; y: number; lastStep: number };

function NeonMazeGame({ character, world, onExit, onCleared }: { character: Character; world: WorldId; onExit: () => void; onCleared: (result: { dots: number; elapsedMs: number; cleared: boolean }) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const keys = useKeys();
  const [hud, setHud] = useState({ dots: 0, dotsTotal: 0, lives: 3, elapsedMs: 0, bossActive: false, progress: 0 });
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const cfg = WORLDS[world];
    const grid = cfg.grid;
    const cols = cfg.cols, rows = cfg.rows;
    const tile = Math.floor(Math.min((W - 40) / cols, (H - 40) / rows));
    const ox = Math.round((W - cols * tile) / 2), oy = Math.round((H - rows * tile) / 2);

    const layers = [2, 3, 4, 5, 6].map((n) => {
      const im = new Image();
      im.src = `/game-universe/neon-maze/${world}/layer_0${n}.png`;
      return im;
    });

    const runFrames = animFrames(character.id, "run", 3);
    const idleFrames = animFrames(character.id, "idle", 2);
    const hitFrames = animFrames(character.id, "hit", 2);

    function open(x: number, y: number) {
      return grid[y]?.[x] !== undefined && grid[y]?.[x] !== "#";
    }

    let px = cfg.start[0], py = cfg.start[1];
    let wantDx = 0, wantDy = 0, curDx = 1, curDy = 0, facingLeft = false;
    let lastStep = 0, lives = 3, invuln = 0, started = performance.now(), elapsedMs = 0, ended = false;
    let dots = new Map<string, boolean>();
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (grid[y][x] === "." && !(x === cfg.start[0] && y === cfg.start[1])) dots.set(`${x},${y}`, true);
    }
    let dotsCollected = 0;
    const dotsTotal = cfg.dotCount;

    const foes: Foe[] = cfg.foeSpawns.map(([x, y]) => ({ x, y, lastStep: 0 }));
    let boss: Foe | null = null;
    let bossAwakened = false;

    function respawn() {
      px = cfg.start[0]; py = cfg.start[1]; curDx = 1; curDy = 0; invuln = 1400;
    }
    function damage() {
      if (invuln > 0 || ended) return;
      lives--; sfx("pickup");
      if (lives <= 0) { ended = true; onCleared({ dots: dotsCollected, elapsedMs, cleared: false }); }
      else respawn();
    }

    let raf = 0, last = performance.now();
    function loop(now: number) {
      const dtMs = now - last; last = now;
      if (ended) return;
      if (pausedRef.current) { raf = requestAnimationFrame(loop); return; }
      elapsedMs = now - started;
      if (invuln > 0) invuln -= dtMs;

      // --- movimento do jogador (grade, passo a passo) ---
      if (keys.current.arrowleft || keys.current.a) { wantDx = -1; wantDy = 0; }
      else if (keys.current.arrowright || keys.current.d) { wantDx = 1; wantDy = 0; }
      else if (keys.current.arrowup || keys.current.w) { wantDx = 0; wantDy = -1; }
      else if (keys.current.arrowdown || keys.current.s) { wantDx = 0; wantDy = 1; }
      if (now - lastStep >= STEP_MS) {
        let moved = false;
        if ((wantDx || wantDy) && open(px + wantDx, py + wantDy)) { px += wantDx; py += wantDy; curDx = wantDx; curDy = wantDy; moved = true; }
        else if ((curDx || curDy) && open(px + curDx, py + curDy)) { px += curDx; py += curDy; moved = true; }
        if (moved) {
          lastStep = now;
          if (curDx !== 0) facingLeft = curDx < 0;
          const key = `${px},${py}`;
          if (dots.get(key)) { dots.set(key, false); dotsCollected++; sfx("pickup"); }
        }
      }

      // --- fantasmas: perseguição gulosa (mesmo padrão do minigame original) ---
      for (const f of foes) {
        if (now - f.lastStep < cfg.ghostMoveMs) continue;
        const opts = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).filter(([dx, dy]) => open(f.x + dx, f.y + dy));
        if (!opts.length) continue;
        opts.sort((a, b) => Math.hypot(px - (f.x + a[0]), py - (f.y + a[1])) - Math.hypot(px - (f.x + b[0]), py - (f.y + b[1])));
        const d = Math.random() < 0.72 ? opts[0] : opts[Math.floor(Math.random() * opts.length)];
        f.x += d[0]; f.y += d[1]; f.lastStep = now;
      }

      // --- chefão: acorda quando todos os pontinhos somem, guarda a saída ---
      if (!bossAwakened && dotsCollected >= dotsTotal) {
        bossAwakened = true;
        boss = { x: cfg.exit[0], y: cfg.exit[1], lastStep: now };
        sfx("pickup");
      }
      if (boss && now - boss.lastStep >= cfg.bossMoveMs) {
        const opts = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).filter(([dx, dy]) => open(boss!.x + dx, boss!.y + dy));
        if (opts.length) {
          opts.sort((a, b) => Math.hypot(px - (boss!.x + a[0]), py - (boss!.y + a[1])) - Math.hypot(px - (boss!.x + b[0]), py - (boss!.y + b[1])));
          boss.x += opts[0][0]; boss.y += opts[0][1];
        }
        boss.lastStep = now;
      }

      // --- colisão ---
      if (foes.some((f) => f.x === px && f.y === py)) damage();
      if (boss && boss.x === px && boss.y === py) damage();
      if (ended) return;

      // --- vitória: todos os pontinhos + chegou na saída ---
      if (dotsCollected >= dotsTotal && px === cfg.exit[0] && py === cfg.exit[1]) {
        ended = true; onCleared({ dots: dotsCollected, elapsedMs, cleared: true }); return;
      }

      setHud({ dots: dotsCollected, dotsTotal, lives, elapsedMs, bossActive: bossAwakened, progress: Math.min(100, Math.round((dotsCollected / dotsTotal) * 100)) });

      // --- desenho ---
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#050914"; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.34;
      for (const im of layers) if (im.complete) ctx.drawImage(im, 0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(4,8,22,.58)"; ctx.fillRect(0, 0, W, H);

      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const xx = ox + x * tile, yy = oy + y * tile;
        if (grid[y][x] === "#") {
          ctx.save();
          ctx.shadowColor = cfg.palette; ctx.shadowBlur = 5;
          ctx.fillStyle = "rgba(10,16,36,.92)"; ctx.fillRect(xx + 1, yy + 1, tile - 2, tile - 2);
          ctx.strokeStyle = cfg.palette; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.75;
          ctx.strokeRect(xx + 2, yy + 2, tile - 4, tile - 4);
          ctx.restore();
        } else {
          const key = `${x},${y}`;
          if (dots.get(key)) {
            ctx.fillStyle = cfg.palette; ctx.shadowColor = cfg.palette; ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(xx + tile / 2, yy + tile / 2, Math.max(2, tile * 0.09), 0, 7); ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }
      // saída - portal apagado até coletar tudo, aceso (e pulsante) depois
      {
        const active = dotsCollected >= dotsTotal;
        const exx = ox + cfg.exit[0] * tile + tile / 2, exy = oy + cfg.exit[1] * tile + tile / 2;
        const pulse = active ? 0.6 + Math.sin(now / 160) * 0.4 : 0.22;
        ctx.save();
        ctx.shadowColor = active ? "#6af0b3" : cfg.palette; ctx.shadowBlur = active ? 22 : 6;
        ctx.strokeStyle = active ? `rgba(106,240,179,${pulse})` : `rgba(255,255,255,.25)`;
        ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(exx, exy, tile * 0.38, 0, 7); ctx.stroke();
        ctx.restore();
      }
      for (const f of foes) {
        const fx = ox + f.x * tile + tile / 2, fy = oy + f.y * tile + tile / 2;
        ctx.save(); ctx.translate(fx, fy);
        ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
        ctx.fillStyle = "#8fe7ff";
        ctx.beginPath(); ctx.arc(0, -2, tile * 0.32, Math.PI, 0);
        ctx.lineTo(tile * 0.32, tile * 0.28);
        for (let i = 3; i >= 0; i--) ctx.lineTo(tile * 0.32 * (i / 4 - 0.375) * 2, tile * (i % 2 ? 0.28 : 0.36));
        ctx.lineTo(-tile * 0.32, tile * 0.28); ctx.closePath(); ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.fillStyle = "#0c2436"; ctx.beginPath(); ctx.arc(-tile * 0.12, -4, tile * 0.08, 0, 7); ctx.arc(tile * 0.12, -4, tile * 0.08, 0, 7); ctx.fill();
        ctx.restore();
      }
      if (boss) {
        const bx = ox + boss.x * tile + tile / 2, by = oy + boss.y * tile + tile / 2;
        ctx.save(); ctx.translate(bx, by);
        ctx.shadowColor = "#ff5b8a"; ctx.shadowBlur = 16;
        ctx.fillStyle = "#ff5b8a";
        ctx.beginPath(); ctx.arc(0, -2, tile * 0.42, Math.PI, 0);
        ctx.lineTo(tile * 0.42, tile * 0.36);
        for (let i = 4; i >= 0; i--) ctx.lineTo(tile * 0.42 * (i / 5 - 0.4) * 2, tile * (i % 2 ? 0.36 : 0.46));
        ctx.lineTo(-tile * 0.42, tile * 0.36); ctx.closePath(); ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.fillStyle = "#2a0b18"; ctx.beginPath(); ctx.arc(-tile * 0.15, -4, tile * 0.1, 0, 7); ctx.arc(tile * 0.15, -4, tile * 0.1, 0, 7); ctx.fill();
        ctx.restore();
      }
      const state = invuln > 0 ? hitFrames : (curDx || curDy) ? runFrames : idleFrames;
      ctx.globalAlpha = invuln > 0 ? (Math.floor(now / 90) % 2 ? 0.4 : 1) : 1;
      drawSprite(ctx, state, now, ox + px * tile + tile * 0.06, oy + py * tile - tile * 0.12, tile * 0.88, tile * 1.05, facingLeft);
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [character.id, world]);

  const touch = bindTouch(keys);
  const cfg = WORLDS[world];
  return (
    <div className="mz-play">
      <div className="mz-hud">
        <span className="mz-brand"><b>AS</b><em>BRASIL</em></span>
        <span className="mz-hud-item mz-lives">{Array.from({ length: hud.lives }, () => "❤").join("")}</span>
        <span className="mz-hud-item">✦ <b>{hud.dots}/{hud.dotsTotal}</b></span>
        <span className="mz-hud-item">⏱ <b>{fmtTime(hud.elapsedMs)}</b></span>
        {hud.bossActive && <span className="mz-hud-item mz-boss-tag">👻 desperto</span>}
        <button className="mz-pause" onClick={() => setPaused((p) => !p)}>{paused ? "▶" : "⏸"}</button>
      </div>
      <div className="mz-stage">
        <strong>MUNDO {WORLD_ORDER.indexOf(world) + 1}</strong><span>{cfg.name.toUpperCase()}</span>
        <div className="mz-stage-track"><i style={{ width: `${hud.progress}%` }} /></div>
      </div>
      <div className="canvas-wrap"><canvas ref={ref} width={W} height={H} /></div>
      {paused && (
        <div className="mz-overlay">
          <h3>Pausado</h3>
          <button onClick={() => setPaused(false)}>Continuar</button>
          <button onClick={onExit}>Sair pra seleção</button>
        </div>
      )}
      <div className="mobile-controls mz-dpad">
        <button data-k="arrowleft" onPointerDown={touch} onPointerUp={touch}>◀</button>
        <div className="mz-dpad-col">
          <button data-k="arrowup" onPointerDown={touch} onPointerUp={touch}>▲</button>
          <button data-k="arrowdown" onPointerDown={touch} onPointerUp={touch}>▼</button>
        </div>
        <button data-k="arrowright" onPointerDown={touch} onPointerUp={touch}>▶</button>
      </div>
    </div>
  );
}

// --- Componente principal: seleção de mundo + resultado --------------------

export function NeonMaze({ character, onFinish }: { character: Character; onFinish: (score: number) => void }) {
  const [worlds, setWorlds] = useState<WorldProgress[] | null>(null);
  const [active, setActive] = useState<WorldId | null>(null);
  const [result, setResult] = useState<{ world: WorldId; cleared: boolean; stars: number; dots: number } | null>(null);

  function loadProgress() {
    fetch("/api/public/neon-maze/progress")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setWorlds(data?.worlds ?? defaultWorlds()))
      .catch(() => setWorlds(defaultWorlds()));
  }
  useEffect(loadProgress, []);

  function defaultWorlds(): WorldProgress[] {
    return WORLD_ORDER.map((id, i) => ({ id, name: WORLDS[id].name, theme: WORLDS[id].theme, unlocked: i === 0, cleared: false, stars: 0, bestScore: 0, bestTimeMs: null }));
  }

  async function handleCleared(world: WorldId, r: { dots: number; elapsedMs: number; cleared: boolean }) {
    let stars = 0;
    try {
      const res = await fetch("/api/public/neon-maze/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ world, dots: r.dots, elapsedMs: r.elapsedMs, cleared: r.cleared }),
      });
      if (res.ok) { const data = await res.json(); stars = data.stars ?? 0; onFinish(data.bestScore ?? 0); }
    } catch {}
    setResult({ world, cleared: r.cleared, stars, dots: r.dots });
    setActive(null);
    loadProgress();
  }

  if (active) {
    return (
      <>
        <NeonMazeGame character={character} world={active} onExit={() => setActive(null)} onCleared={(r) => handleCleared(active, r)} />
        <NeonMazeStyles />
      </>
    );
  }

  if (result) {
    const meta = WORLDS[result.world];
    return (
      <div className="mz-result">
        <h2>{result.cleared ? `${meta.name} concluído!` : "O labirinto venceu dessa vez"}</h2>
        {result.cleared && <div className="mz-stars">{"⭐".repeat(result.stars)}{"☆".repeat(3 - result.stars)}</div>}
        <p>✦ {result.dots} pontos coletados</p>
        <div className="mz-result-actions">
          <button onClick={() => { setResult(null); setActive(result.world); }}>Jogar de novo</button>
          <button onClick={() => setResult(null)}>Voltar pra seleção</button>
        </div>
        <NeonMazeStyles />
      </div>
    );
  }

  return (
    <div className="mz-select">
      <p className="mz-hint">Escolha um mundo pra explorar com {character.name}</p>
      <div className="mz-worlds">
        {(worlds ?? defaultWorlds()).map((w) => {
          const meta = WORLDS[w.id];
          const locked = !w.unlocked;
          return (
            <button
              key={w.id}
              className={`mz-world ${locked ? "locked" : ""}`}
              style={{ backgroundImage: `url(/game-universe/neon-maze/${w.id}/background_full.webp)` }}
              disabled={locked}
              onClick={() => setActive(w.id)}
            >
              <div className="mz-world-shade" />
              <div className="mz-world-body">
                <strong>{meta.name}</strong>
                {w.cleared && <div className="mz-stars small">{"⭐".repeat(w.stars)}{"☆".repeat(3 - w.stars)}</div>}
                {locked && <span className="mz-lock">🔒 Complete o mundo anterior</span>}
                {!locked && <span className="mz-go">EXPLORAR →</span>}
              </div>
            </button>
          );
        })}
      </div>
      <NeonMazeStyles />
    </div>
  );
}

function NeonMazeStyles() {
  return (
    <style jsx global>{`
      .mz-hint{color:#b9c3df;text-align:center;margin:4px 0 16px}
      .mz-worlds{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;max-width:1000px;margin:0 auto}
      .mz-world{position:relative;height:160px;border-radius:16px;border:1px solid #2c3a62;background-size:cover;background-position:center;overflow:hidden;cursor:pointer;padding:0}
      .mz-world:disabled{cursor:not-allowed}
      .mz-world-shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,#0009 100%)}
      .mz-world.locked .mz-world-shade{background:#000a}
      .mz-world-body{position:absolute;left:0;right:0;bottom:0;padding:10px;display:flex;flex-direction:column;gap:2px;text-align:left;color:#fff}
      .mz-world-body strong{font-size:13px;line-height:1.2}
      .mz-lock{font-size:10px;color:#ffd23f;margin-top:4px}
      .mz-go{font-size:10px;color:#7ce7ff;margin-top:4px;font-weight:700}
      .mz-stars{font-size:15px;color:#ffd52a}
      .mz-stars.small{font-size:12px}
      .mz-result{max-width:420px;margin:40px auto;text-align:center;color:#fff}
      .mz-result-actions{display:flex;gap:10px;justify-content:center;margin-top:16px}
      .mz-result-actions button{background:#172341;border:1px solid #405180;color:#fff;border-radius:12px;padding:10px 16px;font-weight:700}
      .arcade-shell:has(.mz-play){padding:0!important;overflow:hidden;background:#050914;min-height:100dvh}
      .arcade-shell:has(.mz-play) .game-head{position:fixed;z-index:40;top:14px;left:14px;right:14px;max-width:none;margin:0;pointer-events:none}
      .arcade-shell:has(.mz-play) .game-head button{pointer-events:auto;background:rgba(5,11,27,.62);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(14px);box-shadow:0 8px 30px #0005}
      .arcade-shell:has(.mz-play) .game-head div{display:none}
      .arcade-shell:has(.mz-play) .game-head img{margin-left:auto;width:48px;height:48px;padding:5px;border-radius:16px;background:rgba(5,11,27,.58);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(14px)}
      .mz-play{position:relative;width:100vw;height:100dvh;overflow:hidden;background:radial-gradient(circle at 50% 30%,#1c2b5c 0%,#0e1638 48%,#050914 100%);display:flex;align-items:center;justify-content:center}
      .mz-play .canvas-wrap{position:relative;width:min(100vw,calc(100dvh * 12 / 7));height:min(100dvh,calc(100vw * 7 / 12));padding:0!important;border:0!important;border-radius:16px!important;background:#050914!important;overflow:hidden;box-shadow:0 0 0 2px rgba(79,95,255,.55),0 0 46px 8px rgba(79,95,255,.3),0 30px 80px rgba(0,0,0,.55)!important}
      .mz-play .canvas-wrap canvas{display:block;width:100%!important;height:100%!important;max-height:none!important;object-fit:fill!important;border-radius:inherit!important}
      .mz-play .mz-hud{position:absolute;z-index:12;top:16px;left:16px;display:flex;align-items:center;gap:7px;padding:7px 9px;background:linear-gradient(180deg,rgba(8,27,51,.92),rgba(4,15,32,.86));border:1px solid rgba(89,203,255,.36);border-radius:13px;backdrop-filter:blur(14px);box-shadow:0 12px 34px #0007,inset 0 1px #ffffff16}
      .mz-brand{display:flex;align-items:center;gap:6px;padding:3px 9px 3px 4px;border-right:1px solid #ffffff24;color:#fff}
      .mz-brand b{display:grid;place-items:center;width:32px;height:26px;border-radius:7px;background:#fff;color:#092441;font-size:14px;font-style:italic}
      .mz-brand em{font-size:11px;font-weight:900;font-style:normal;letter-spacing:.7px}
      .mz-hud-item{color:#fff;font-weight:700;font-size:12px;line-height:1;padding:7px 8px;border-radius:8px;background:rgba(255,255,255,.055);text-shadow:0 2px 8px #000;white-space:nowrap}
      .mz-lives{color:#ff5f93;letter-spacing:1px}
      .mz-boss-tag{color:#ff8fae}
      .mz-pause{margin-left:0;width:32px;height:32px;background:#0d4e85;border:1px solid rgba(74,186,255,.4);color:#fff;border-radius:8px;display:grid;place-items:center}
      .mz-stage{position:absolute;z-index:12;top:16px;right:16px;width:190px;padding:8px 10px;border-radius:12px;background:linear-gradient(180deg,rgba(8,27,51,.9),rgba(4,15,32,.82));border:1px solid rgba(89,203,255,.3);backdrop-filter:blur(12px);box-shadow:0 10px 30px #0005;color:#fff}
      .mz-stage strong{font-size:10px;color:#68d8ff;letter-spacing:1px;margin-right:6px}
      .mz-stage span{font-size:10px;font-weight:900;letter-spacing:.5px}
      .mz-stage-track{height:4px;margin-top:6px;background:rgba(255,255,255,.11);border-radius:99px;overflow:hidden}
      .mz-stage-track i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#36c9ff,#69f0b3);box-shadow:0 0 9px #39d9ff}
      .mz-play .mobile-controls.mz-dpad{position:absolute;z-index:14;left:18px;right:auto;bottom:max(18px,env(safe-area-inset-bottom));display:flex;align-items:center;gap:10px;margin:0}
      .mz-dpad-col{display:flex;flex-direction:column;gap:8px}
      .mz-play .mz-dpad button{min-width:56px;min-height:50px;border:1px solid rgba(255,255,255,.24);background:rgba(5,11,27,.48);color:#fff;border-radius:16px;font-weight:900;backdrop-filter:blur(12px);box-shadow:0 10px 30px #0005;text-shadow:0 2px 8px #000}
      .mz-play .mz-dpad button:active{transform:scale(.94);background:rgba(85,104,255,.62)}
      .mz-overlay{position:absolute;z-index:30;inset:0;background:rgba(2,6,18,.72);backdrop-filter:blur(12px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff;border-radius:0}
      .mz-overlay button{background:#172341;border:1px solid #405180;color:#fff;border-radius:12px;padding:10px 18px;font-weight:700}
      @media(max-width:720px){
        .mz-worlds{grid-template-columns:repeat(2,1fr)}
        .arcade-shell:has(.mz-play) .game-head{top:8px;left:8px;right:8px}
        .arcade-shell:has(.mz-play) .game-head img{display:none}
        .mz-play .mz-hud{top:8px;left:8px;gap:3px;padding:4px}
        .mz-brand em{display:none}
        .mz-brand{padding-right:4px}
        .mz-brand b{width:28px;height:25px}
        .mz-hud-item{font-size:10px;padding:6px 5px}
        .mz-stage{top:49px;right:8px;width:145px;padding:6px 8px}
        .mz-stage span{font-size:9px}
        .mz-play .mobile-controls.mz-dpad{left:10px;bottom:max(10px,env(safe-area-inset-bottom))}
      }
    `}</style>
  );
}
