"use client";

// AS World Adventure - fase de plataforma dentro do hub /universo-as/arcade
// (Game Universe). Substitui o antigo minigame de uma faixa só (PlatformGame
// em ArcadeUniverse.tsx) por 3 cidades com progresso permanente salvo no
// banco (ver prisma/schema.prisma::ArcadeProgress e
// app/api/public/arcade/progress/route.ts).
//
// V1 (29/09): só o Rio de Janeiro tem fase montada de verdade. São Paulo e
// Brasília já aparecem na seleção (com o cenário real da cidade) mas
// travadas com "Em breve" - o desbloqueio sequencial já funciona, falta só
// desenhar a fase de cada uma.
//
// Inimigos, chefão e ícones de coletável/power-up são formas simples
// desenhadas no canvas (não os recortes do kit de produção, que vieram sem
// separação por sprite - ver decisão registrada em
// claude/pendencias-sorteios.md). Os personagens (7) e o cenário/tileset do
// Rio usam os assets reais.

import { useEffect, useRef, useState } from "react";

type Character = { id: string; name: string; src: string };
type CityId = "rio" | "sao-paulo" | "brasilia";
const CITY_ORDER: CityId[] = ["rio", "sao-paulo", "brasilia"];

const CITY_META: Record<CityId, { name: string; landmark: string; sky: string; ground: string; accent: string; bossName: string }> = {
  rio: { name: "Rio de Janeiro", landmark: "Cristo Redentor", sky: "#4fc3ff", ground: "#3a9152", accent: "#ffd23f", bossName: "Guardião do Pão de Açúcar" },
  "sao-paulo": { name: "São Paulo", landmark: "Avenida Paulista", sky: "#7c6fe0", ground: "#4a4a63", accent: "#ff7fc8", bossName: "Guardião da Paulista" },
  brasilia: { name: "Brasília", landmark: "Congresso Nacional", sky: "#4fe0c8", ground: "#3f8f7a", accent: "#ffe07b", bossName: "Guardião do Congresso" },
};

type CityProgress = {
  id: CityId; name: string; playable: boolean; unlocked: boolean;
  cleared: boolean; stars: number; bestScore: number; bestTimeMs: number | null;
};

function animFrames(character: string, state: string, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const im = new Image();
    im.src = `/game-universe/animated/${character}/${state}/${state}_${String(i).padStart(2, "0")}.png`;
    return im;
  });
}
function drawSprite(ctx: CanvasRenderingContext2D, frames: HTMLImageElement[], now: number, x: number, y: number, w: number, h: number, fps = 105) {
  const im = frames[Math.floor(now / fps) % frames.length];
  if (im?.complete) ctx.drawImage(im, x, y, w, h);
}
// Preenche a largura toda do canvas ladrilhando a imagem, espelhando cada
// ladrilho alternado (mirror repeat). Os fundos do kit (492x230) não foram
// feitos pra dar loop perfeito - ladrilhar direto (2 cópias lado a lado)
// deixava uma emenda visível onde a borda direita de uma cópia encontra a
// esquerda da próxima. Espelhando, a borda de cada ladrilho sempre bate
// com o espelho dela mesma, então a emenda some.
function drawParallaxLayer(ctx: CanvasRenderingContext2D, im: HTMLImageElement, scroll: number, w: number, h: number) {
  if (!im.complete || !im.naturalWidth) return;
  const tw = im.naturalWidth;
  const off = ((scroll % tw) + tw) % tw;
  const baseIndex = Math.floor(scroll / tw);
  let x = -off, i = 0;
  while (x < w) {
    if ((baseIndex + i) % 2 !== 0) {
      ctx.save();
      ctx.translate(x + tw, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(im, 0, 0, tw, h);
      ctx.restore();
    } else {
      ctx.drawImage(im, x, 0, tw, h);
    }
    x += tw; i++;
  }
}
function sfx(name: string) {
  try { const a = new Audio(`/game-universe/audio/${name}.wav`); a.volume = 0.28; a.play().catch(() => {}); } catch {}
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

const W = 720, H = 420;

// --- Fase do Rio de Janeiro -------------------------------------------------
// Layout fixo (mesma ideia dos outros jogos do arcade: números "artesanais",
// sem editor visual). Plataformas elevadas, sem poço/queda - dano só vem de
// inimigo/chefão, pra manter o jogo acessível em touch.
const RIO_LEVEL = {
  length: 3400,
  ground: 360,
  platforms: [
    { x: 260, y: 290, w: 130 }, { x: 560, y: 250, w: 110 }, { x: 860, y: 300, w: 140 },
    { x: 1180, y: 240, w: 120 }, { x: 1480, y: 285, w: 150 }, { x: 1820, y: 230, w: 130 },
    { x: 2140, y: 280, w: 150 }, { x: 2460, y: 245, w: 120 }, { x: 2760, y: 300, w: 140 },
  ],
  checkpoints: [1180, 2140],
  coins: Array.from({ length: 24 }, (_, i) => ({ x: 200 + i * 135, y: 245 - (i % 4) * 40 })),
  hearts: [{ x: 900, y: 260 }, { x: 2200, y: 220 }],
  enemies: [
    { x: 500, y: 335, range: 90 }, { x: 950, y: 335, range: 100 }, { x: 1400, y: 335, range: 90 },
    { x: 1750, y: 335, range: 110 }, { x: 2050, y: 335, range: 90 }, { x: 2500, y: 335, range: 100 },
  ],
  bossX: 3150,
};

type EntityState = { x: number; y: number; d: 1 | -1; baseX: number; range: number; alive: boolean; hitCooldown: number; variant: number };

function WorldAdventureGame({ character, city, onExit, onCleared }: { character: Character; city: CityId; onExit: () => void; onCleared: (result: { coins: number; elapsedMs: number; cleared: boolean }) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const keys = useKeys();
  const jumpRef = useRef(() => {});
  const slideRef = useRef(() => {});
  const [hud, setHud] = useState({ coins: 0, lives: 3, elapsedMs: 0, bossHp: 3, bossVisible: false, progress: 0 });
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const meta = CITY_META[city];
    const level = RIO_LEVEL; // única fase montada por enquanto

    const layers = Array.from({ length: 6 }, (_, i) => {
      const im = new Image();
      im.src = `/game-universe/world-adventure/backgrounds/${city}/layer_0${i + 1}.png`;
      return im;
    });
    const tileset = new Image();
    tileset.src = `/game-universe/world-adventure/tiles/${city}/tileset.png`;

    const runFrames = animFrames(character.id, "run", 3);
    const jumpFrames = animFrames(character.id, "jump", 4);
    const idleFrames = animFrames(character.id, "idle", 2);
    const slideFrames = animFrames(character.id, "slide", 2);
    const hitFrames = animFrames(character.id, "hit", 2);

    let px = 70, py = 300, vx = 0, vy = 0, cam = 0;
    let coins = 0, lives = 3, invuln = 0, sliding = 0;
    let checkpointX = 70, elapsedMs = 0, started = performance.now();
    let bossHp = 3, bossDefeated = false, bossInvuln = 0;
    const bossX = level.bossX, bossY = level.ground - 70;

    const enemies: EntityState[] = level.enemies.map((e, i) => ({ x: e.x, y: e.y, d: 1, baseX: e.x, range: e.range, alive: true, hitCooldown: 0, variant: i % 3 }));
    const coinsLeft = level.coins.map((c) => ({ ...c, taken: false }));
    const heartsLeft = level.hearts.map((h) => ({ ...h, taken: false }));

    jumpRef.current = () => {
      const grounded = py >= level.ground - 43 || level.platforms.some((p) => px + 30 > p.x && px < p.x + p.w && Math.abs(py + 52 - p.y) < 8);
      if (grounded) { vy = -10.8; sfx("pickup"); }
    };
    slideRef.current = () => { if (sliding <= 0 && py >= level.ground - 44) sliding = 420; };

    let raf = 0, last = performance.now(), ended = false;
    function damage() {
      if (invuln > 0 || ended) return;
      lives--; invuln = 1200;
      if (lives <= 0) {
        if (checkpointX > 70) { px = checkpointX; py = 260; vy = 0; lives = 3; }
        else { ended = true; onCleared({ coins, elapsedMs, cleared: false }); }
      }
    }

    function loop(now: number) {
      const dt = Math.min(2, (now - last) / 16.67);
      last = now;
      if (ended) return; // resultado já reportado - para de simular/desenhar, sem agendar novo frame
      if (pausedRef.current) { raf = requestAnimationFrame(loop); return; }
      elapsedMs = now - started;

      vx = ((keys.current.arrowright || keys.current.d || keys.current.right) ? 4.3 : 0) - ((keys.current.arrowleft || keys.current.a || keys.current.left) ? 4.3 : 0);
      if (keys.current.arrowup || keys.current.w || keys.current[" "]) { jumpRef.current(); keys.current.arrowup = keys.current.w = keys.current[" "] = false; }
      if (keys.current.arrowdown || keys.current.s) { slideRef.current(); keys.current.arrowdown = keys.current.s = false; }

      if (sliding > 0) { sliding -= now - last + 16; vx = vx || (px < bossX ? 3.2 : 0); }
      px = Math.max(50, Math.min(level.length, px + vx * dt * (sliding > 0 ? 1.3 : 1)));
      vy += 0.55 * dt; py += vy * dt;
      let floor = level.ground;
      for (const p of level.platforms) if (px + 42 > p.x && px < p.x + p.w && py + 54 >= p.y && py + 54 <= p.y + 16 && vy >= 0) floor = Math.min(floor, p.y - 54);
      if (py >= floor) { py = floor; vy = 0; }
      cam = Math.max(0, Math.min(level.length - W + 80, px - 220));
      if (invuln > 0) invuln -= now - last + 16;

      for (const cp of level.checkpoints) if (px >= cp && checkpointX < cp) checkpointX = cp;

      for (const c of coinsLeft) if (!c.taken && Math.hypot(px - c.x, py - c.y) < 40) { c.taken = true; coins++; sfx("pickup"); }
      for (const h of heartsLeft) if (!h.taken && Math.hypot(px - h.x, py - h.y) < 40) { h.taken = true; lives = Math.min(5, lives + 1); }

      for (const e of enemies) {
        if (!e.alive) continue;
        e.x += e.d * 0.6 * dt;
        if (e.x > e.baseX + e.range || e.x < e.baseX - e.range) e.d = e.d === 1 ? -1 : 1;
        if (e.hitCooldown > 0) e.hitCooldown -= now - last + 16;
        const dx = Math.abs(px - e.x), dy = py - e.y;
        if (dx < 32 && dy < 6 && dy > -34 && vy > 0) { e.alive = false; vy = -7.5; coins += 2; sfx("pickup"); }
        else if (dx < 30 && Math.abs(dy) < 36) damage();
      }
      if (ended) return; // damage() acabou de reportar derrota - para aqui, sem agendar novo frame

      const bossActive = !bossDefeated && px > bossX - 260;
      if (bossActive && bossInvuln > 0) bossInvuln -= now - last + 16;
      if (bossActive) {
        const dx = Math.abs(px - bossX), dy = py - bossY;
        if (dx < 46 && dy < 10 && dy > -60 && vy > 0) {
          if (bossInvuln <= 0) { bossHp--; bossInvuln = 700; vy = -8; if (bossHp <= 0) { bossDefeated = true; sfx("pickup"); } }
        } else if (dx < 40 && Math.abs(dy) < 50) damage();
      }
      if (bossDefeated && px > bossX + 40) { ended = true; onCleared({ coins, elapsedMs, cleared: true }); return; }

      setHud({ coins, lives, elapsedMs, bossHp, bossVisible: bossActive && !bossDefeated, progress: Math.min(100, Math.round((px / level.length) * 100)) });

      // --- desenho ---
      ctx.clearRect(0, 0, W, H);
      let skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, meta.sky); skyGrad.addColorStop(1, "#eafcff");
      ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);
      const speeds = [0.05, 0.1, 0.18, 0.3, 0.5, 0.75];
      layers.forEach((im, i) => drawParallaxLayer(ctx, im, cam * speeds[i], W, H));
      // Vinheta sutil pra dar profundidade sem precisar de imagem nenhuma.
      const atmosphere = ctx.createLinearGradient(0, 0, 0, H);
      atmosphere.addColorStop(0, "rgba(5,18,38,.05)");
      atmosphere.addColorStop(0.68, "rgba(5,18,38,0)");
      atmosphere.addColorStop(1, "rgba(3,10,24,.22)");
      ctx.fillStyle = atmosphere; ctx.fillRect(0, 0, W, H);
      // Piso integrado ao cenário: grama, terra e sombra em vez de um bloco chapado.
      const groundGrad = ctx.createLinearGradient(0, level.ground, 0, H);
      groundGrad.addColorStop(0, "#4fa95f");
      groundGrad.addColorStop(0.16, "#347c49");
      groundGrad.addColorStop(1, "#173d31");
      ctx.fillStyle = groundGrad; ctx.fillRect(0, level.ground, W, H - level.ground);
      ctx.fillStyle = "rgba(154,220,111,.85)"; ctx.fillRect(0, level.ground, W, 5);
      ctx.fillStyle = "rgba(15,55,42,.42)"; ctx.fillRect(0, level.ground + 22, W, 3);
      for (const p of level.platforms) {
        const sx = p.x - cam;
        if (sx < -160 || sx > W + 40) continue;
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,.28)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 5;
        ctx.fillStyle = "#2d6f45"; ctx.fillRect(sx, p.y + 7, p.w, 17);
        ctx.shadowColor = "transparent";
        ctx.fillStyle = "#78bd62"; ctx.fillRect(sx, p.y, p.w, 9);
        ctx.fillStyle = "#a9dc72"; ctx.fillRect(sx + 3, p.y, Math.max(0, p.w - 6), 3);
        if (tileset.complete) {
          ctx.globalAlpha = .24;
          for (let tx = 0; tx < p.w; tx += 30) ctx.drawImage(tileset, 0, 0, 32, 32, sx + tx, p.y + 7, Math.min(30, p.w - tx), 17);
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      }
      for (const cp of level.checkpoints) {
        const sx = cp - cam; if (sx < -20 || sx > W + 20) continue;
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, level.ground); ctx.lineTo(sx, level.ground - 70); ctx.stroke();
        ctx.fillStyle = px >= cp ? "#6af0b3" : "#ffffffaa"; ctx.beginPath(); ctx.moveTo(sx, level.ground - 70); ctx.lineTo(sx + 26, level.ground - 58); ctx.lineTo(sx, level.ground - 46); ctx.fill();
      }
      for (const c of coinsLeft) if (!c.taken) { const sx = c.x - cam; if (sx < -20 || sx > W + 20) continue; ctx.fillStyle = "#ffd52a"; ctx.beginPath(); ctx.arc(sx, c.y, 10, 0, 7); ctx.fill(); ctx.strokeStyle = "#fff4a0"; ctx.stroke(); }
      for (const h of heartsLeft) if (!h.taken) { const sx = h.x - cam; if (sx < -20 || sx > W + 20) continue; ctx.fillStyle = "#ff5b8a"; ctx.font = "20px sans-serif"; ctx.fillText("❤", sx - 9, h.y + 7); }
      for (const e of enemies) if (e.alive) {
        const sx = e.x - cam; if (sx < -36 || sx > W + 36) continue;
        const bob = Math.sin(now / 190 + e.baseX) * 2;
        ctx.save(); ctx.translate(sx, e.y + bob);
        ctx.shadowColor = "rgba(0,0,0,.28)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 5;
        const enemyColors = ["#ffcf3f", "#54d6c8", "#ff78a9"];
        ctx.fillStyle = enemyColors[e.variant]; ctx.beginPath(); ctx.roundRect(-20, -18, 40, 34, 12); ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.strokeStyle = "#17334a"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-18, 2); ctx.lineTo(-26, 9); ctx.moveTo(18, 2); ctx.lineTo(26, 9); ctx.stroke();
        ctx.fillStyle = "#163149"; ctx.beginPath(); ctx.roundRect(-14, -10, 28, 12, 6); ctx.fill();
        ctx.fillStyle = "#8ff7ff"; ctx.beginPath(); ctx.arc(-6, -4, 2.6, 0, Math.PI * 2); ctx.arc(6, -4, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#17334a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, -27); ctx.stroke();
        ctx.fillStyle = "#ff5b8a"; ctx.beginPath(); ctx.arc(0, -29, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      if (bossActive) {
        const sx = bossX - cam;
        const flash = bossInvuln > 0;
        ctx.save(); ctx.translate(sx, bossY);
        ctx.shadowColor = flash ? "#fff" : "#b96cff"; ctx.shadowBlur = flash ? 28 : 16;
        const bossGrad = ctx.createLinearGradient(-42, -52, 42, 48);
        bossGrad.addColorStop(0, flash ? "#fff" : "#8050a8");
        bossGrad.addColorStop(.55, flash ? "#fff" : "#513071");
        bossGrad.addColorStop(1, flash ? "#eee" : "#271d4a");
        ctx.fillStyle = bossGrad; ctx.beginPath();
        ctx.moveTo(-40, 36); ctx.quadraticCurveTo(-52, 0, -27, -39);
        ctx.quadraticCurveTo(0, -61, 29, -38); ctx.quadraticCurveTo(53, 0, 40, 36);
        ctx.quadraticCurveTo(0, 50, -40, 36); ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.fillStyle = "#171d3a"; ctx.beginPath(); ctx.roundRect(-27, -23, 54, 24, 10); ctx.fill();
        ctx.fillStyle = flash ? "#fff" : "#ff78cf"; ctx.beginPath(); ctx.arc(-11, -11, 5, 0, Math.PI * 2); ctx.arc(11, -11, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#62f3da"; ctx.beginPath(); ctx.arc(0, 17, 9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.72)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 17, 14, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = "#fff"; ctx.font = "800 13px sans-serif"; ctx.textAlign = "center";
        ctx.shadowColor = "#000"; ctx.shadowBlur = 6; ctx.fillText(meta.bossName, sx, bossY - 68); ctx.shadowBlur = 0; ctx.textAlign = "left";
      }
      const state = invuln > 0 ? hitFrames : sliding > 0 ? slideFrames : vy !== 0 ? jumpFrames : vx !== 0 ? runFrames : idleFrames;
      ctx.globalAlpha = invuln > 0 ? (Math.floor(now / 90) % 2 ? 0.4 : 1) : 1;
      if (sliding <= 0) {
        ctx.save(); ctx.globalAlpha = .22; ctx.fillStyle = "#07150f";
        ctx.beginPath(); ctx.ellipse(px - cam + 5, py + 51, 24, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      drawSprite(ctx, state, now, px - cam - 38, py - (sliding > 0 ? 5 : 25), 88, sliding > 0 ? 46 : 88);
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [character.id, city]);

  const touch = bindTouch(keys);
  const meta = CITY_META[city];
  return (
    <div className="wa-play">
      <div className="wa-hud">
        <span className="wa-brand"><b>AS</b><em>BRASIL</em></span>
        <span className="wa-hud-item wa-lives">{Array.from({ length: hud.lives }, (_, i) => "❤").join("")}</span>
        <span className="wa-hud-item">🪙 <b>{String(hud.coins).padStart(3, "0")}</b></span>
        <span className="wa-hud-item">⏱ <b>{fmtTime(hud.elapsedMs)}</b></span>
        {hud.bossVisible && <span className="wa-hud-item wa-boss-hp">👑 <b>{hud.bossHp}/3</b></span>}
        <button className="wa-pause" onClick={() => setPaused((p) => !p)}>{paused ? "▶" : "⏸"}</button>
      </div>
      <div className="wa-stage">
        <strong>FASE {CITY_ORDER.indexOf(city) + 1}</strong><span>{meta.name.toUpperCase()}</span>
        <div className="wa-stage-track"><i style={{ width: `${hud.progress}%` }} /></div>
      </div>
      <div className="canvas-wrap"><canvas ref={ref} width={W} height={H} /></div>
      {paused && (
        <div className="wa-overlay">
          <h3>Pausado</h3>
          <button onClick={() => setPaused(false)}>Continuar</button>
          <button onClick={onExit}>Sair pra seleção</button>
        </div>
      )}
      <div className="mobile-controls">
        <div>
          <button data-k="left" onPointerDown={touch} onPointerUp={touch}>◀</button>
          <button data-k="right" onPointerDown={touch} onPointerUp={touch}>▶</button>
        </div>
        <button onPointerDown={() => slideRef.current()}>DESLIZAR</button>
        <button onPointerDown={() => jumpRef.current()}>PULAR</button>
      </div>
    </div>
  );
}

// --- Componente principal: seleção de cidade + resultado --------------------

export function WorldAdventure({ character, onFinish }: { character: Character; onFinish: (score: number) => void }) {
  const [cities, setCities] = useState<CityProgress[] | null>(null);
  const [active, setActive] = useState<CityId | null>(null);
  const [result, setResult] = useState<{ city: CityId; cleared: boolean; stars: number; coins: number } | null>(null);

  function loadProgress() {
    fetch("/api/public/arcade/progress")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCities(data?.cities ?? defaultCities()))
      .catch(() => setCities(defaultCities()));
  }
  useEffect(loadProgress, []);

  function defaultCities(): CityProgress[] {
    return CITY_ORDER.map((id, i) => ({ id, name: CITY_META[id].name, playable: id === "rio", unlocked: i === 0, cleared: false, stars: 0, bestScore: 0, bestTimeMs: null }));
  }

  async function handleCleared(city: CityId, r: { coins: number; elapsedMs: number; cleared: boolean }) {
    let stars = 0;
    try {
      const res = await fetch("/api/public/arcade/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, coins: r.coins, elapsedMs: r.elapsedMs, cleared: r.cleared }),
      });
      if (res.ok) { const data = await res.json(); stars = data.stars ?? 0; onFinish(data.bestScore ?? 0); }
    } catch {}
    setResult({ city, cleared: r.cleared, stars, coins: r.coins });
    setActive(null);
    loadProgress();
  }

  if (active) {
    return (
      <>
        <WorldAdventureGame character={character} city={active} onExit={() => setActive(null)} onCleared={(r) => handleCleared(active, r)} />
        <WorldAdventureStyles />
      </>
    );
  }

  if (result) {
    const meta = CITY_META[result.city];
    return (
      <div className="wa-result">
        <h2>{result.cleared ? `${meta.name} concluída!` : "Você perdeu essa"}</h2>
        {result.cleared && <div className="wa-stars">{"⭐".repeat(result.stars)}{"☆".repeat(3 - result.stars)}</div>}
        <p>🪙 {result.coins} moedas coletadas</p>
        <div className="wa-result-actions">
          <button onClick={() => { setResult(null); setActive(result.city); }}>Jogar de novo</button>
          <button onClick={() => setResult(null)}>Voltar pra seleção</button>
        </div>
        <WorldAdventureStyles />
      </div>
    );
  }

  return (
    <div className="wa-select">
      <p className="wa-hint">Escolha uma cidade pra jogar com {character.name}</p>
      <div className="wa-cities">
        {(cities ?? defaultCities()).map((c) => {
          const meta = CITY_META[c.id];
          const locked = !c.unlocked;
          const comingSoon = c.unlocked && !c.playable;
          return (
            <button
              key={c.id}
              className={`wa-city ${locked ? "locked" : ""}`}
              style={{ backgroundImage: `url(/game-universe/world-adventure/backgrounds/${c.id}/background_full.webp)` }}
              disabled={locked || comingSoon}
              onClick={() => setActive(c.id)}
            >
              <div className="wa-city-shade" />
              <div className="wa-city-body">
                <strong>{meta.name}</strong>
                <span>{meta.landmark}</span>
                {c.cleared && <div className="wa-stars small">{"⭐".repeat(c.stars)}{"☆".repeat(3 - c.stars)}</div>}
                {locked && <span className="wa-lock">🔒 Complete a fase anterior</span>}
                {comingSoon && <span className="wa-lock">Em breve</span>}
                {!locked && !comingSoon && <span className="wa-go">JOGAR →</span>}
              </div>
            </button>
          );
        })}
      </div>
      <WorldAdventureStyles />
    </div>
  );
}

function WorldAdventureStyles() {
  return (
    <style jsx global>{`
      .wa-hint{color:#b9c3df;text-align:center;margin:4px 0 16px}
      .wa-cities{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:820px;margin:0 auto}
      .wa-city{position:relative;height:190px;border-radius:20px;border:1px solid #2c3a62;background-size:cover;background-position:center;overflow:hidden;cursor:pointer;padding:0}
      .wa-city:disabled{cursor:not-allowed}
      .wa-city-shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,#0009 100%)}
      .wa-city.locked .wa-city-shade{background:#0009}
      .wa-city-body{position:absolute;left:0;right:0;bottom:0;padding:12px;display:flex;flex-direction:column;gap:2px;text-align:left;color:#fff}
      .wa-city-body strong{font-size:17px}
      .wa-city-body span{font-size:12px;color:#dbe3ff}
      .wa-lock{font-size:11px;color:#ffd23f;margin-top:4px}
      .wa-go{font-size:11px;color:#7ce7ff;margin-top:4px;font-weight:700}
      .wa-stars{font-size:15px;color:#ffd52a}
      .wa-stars.small{font-size:13px}
      .wa-result{max-width:420px;margin:40px auto;text-align:center;color:#fff}
      .wa-result-actions{display:flex;gap:10px;justify-content:center;margin-top:16px}
      .wa-result-actions button{background:#172341;border:1px solid #405180;color:#fff;border-radius:12px;padding:10px 16px;font-weight:700}
      .arcade-shell:has(.wa-play){padding:0!important;overflow:hidden;background:#050914;min-height:100dvh}
      .arcade-shell:has(.wa-play) .game-head{position:fixed;z-index:40;top:14px;left:14px;right:14px;max-width:none;margin:0;pointer-events:none}
      .arcade-shell:has(.wa-play) .game-head button{pointer-events:auto;background:rgba(5,11,27,.62);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(14px);box-shadow:0 8px 30px #0005}
      .arcade-shell:has(.wa-play) .game-head div{display:none}
      .arcade-shell:has(.wa-play) .game-head img{margin-left:auto;width:48px;height:48px;padding:5px;border-radius:16px;background:rgba(5,11,27,.58);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(14px)}
      .wa-play{position:relative;width:100vw;height:100dvh;overflow:hidden;background:radial-gradient(circle at 50% 30%,#1c2b5c 0%,#0e1638 48%,#050914 100%);display:flex;align-items:center;justify-content:center}
      .wa-play .canvas-wrap{position:relative;width:min(100vw,calc(100dvh * 12 / 7));height:min(100dvh,calc(100vw * 7 / 12));padding:0!important;border:0!important;border-radius:16px!important;background:#050914!important;overflow:hidden;box-shadow:0 0 0 2px rgba(79,95,255,.55),0 0 46px 8px rgba(79,95,255,.3),0 30px 80px rgba(0,0,0,.55)!important}
      .wa-play .canvas-wrap canvas{display:block;width:100%!important;height:100%!important;max-height:none!important;object-fit:fill!important;border-radius:inherit!important}
      .wa-play .wa-hud{position:absolute;z-index:12;top:16px;left:16px;display:flex;align-items:center;gap:7px;padding:7px 9px;background:linear-gradient(180deg,rgba(8,27,51,.92),rgba(4,15,32,.86));border:1px solid rgba(89,203,255,.36);border-radius:13px;backdrop-filter:blur(14px);box-shadow:0 12px 34px #0007,inset 0 1px #ffffff16}
      .wa-brand{display:flex;align-items:center;gap:6px;padding:3px 9px 3px 4px;border-right:1px solid #ffffff24;color:#fff}
      .wa-brand b{display:grid;place-items:center;width:32px;height:26px;border-radius:7px;background:#fff;color:#092441;font-size:14px;font-style:italic}
      .wa-brand em{font-size:11px;font-weight:900;font-style:normal;letter-spacing:.7px}
      .wa-hud-item{color:#fff;font-weight:700;font-size:12px;line-height:1;padding:7px 8px;border-radius:8px;background:rgba(255,255,255,.055);text-shadow:0 2px 8px #000;white-space:nowrap}
      .wa-lives{color:#ff5f93;letter-spacing:1px}
      .wa-boss-hp{color:#ff7fc8}
      .wa-pause{margin-left:0;width:32px;height:32px;background:#0d4e85;border:1px solid rgba(74,186,255,.4);color:#fff;border-radius:8px;display:grid;place-items:center}
      .wa-stage{position:absolute;z-index:12;top:16px;right:16px;width:190px;padding:8px 10px;border-radius:12px;background:linear-gradient(180deg,rgba(8,27,51,.9),rgba(4,15,32,.82));border:1px solid rgba(89,203,255,.3);backdrop-filter:blur(12px);box-shadow:0 10px 30px #0005;color:#fff}
      .wa-stage strong{font-size:10px;color:#68d8ff;letter-spacing:1px;margin-right:6px}
      .wa-stage span{font-size:10px;font-weight:900;letter-spacing:.5px}
      .wa-stage-track{height:4px;margin-top:6px;background:rgba(255,255,255,.11);border-radius:99px;overflow:hidden}
      .wa-stage-track i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#36c9ff,#69f0b3);box-shadow:0 0 9px #39d9ff}
      .wa-play .mobile-controls{position:absolute;z-index:14;left:18px;right:18px;bottom:max(18px,env(safe-area-inset-bottom));display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:0}
      .wa-play .mobile-controls button{min-width:64px;min-height:54px;border:1px solid rgba(255,255,255,.24);background:rgba(5,11,27,.48);color:#fff;border-radius:20px;font-weight:900;backdrop-filter:blur(12px);box-shadow:0 10px 30px #0005;text-shadow:0 2px 8px #000}
      .wa-play .mobile-controls button:active{transform:scale(.94);background:rgba(85,104,255,.62)}
      .wa-overlay{position:absolute;z-index:30;inset:0;background:rgba(2,6,18,.72);backdrop-filter:blur(12px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff;border-radius:0}
      .wa-overlay button{background:#172341;border:1px solid #405180;color:#fff;border-radius:12px;padding:10px 18px;font-weight:700}
      @media(max-width:720px){
        .wa-cities{grid-template-columns:1fr}
        .arcade-shell:has(.wa-play) .game-head{top:8px;left:8px;right:8px}
        .arcade-shell:has(.wa-play) .game-head img{display:none}
        .wa-play .wa-hud{top:8px;left:8px;right:auto;gap:3px;padding:4px}
        .wa-brand em{display:none}
        .wa-brand{padding-right:4px}
        .wa-brand b{width:28px;height:25px}
        .wa-hud-item{font-size:10px;padding:6px 5px}
        .wa-stage{top:49px;right:8px;width:145px;padding:6px 8px}
        .wa-stage span{font-size:9px}
        .wa-play .mobile-controls{left:10px;right:10px;bottom:max(10px,env(safe-area-inset-bottom))}
        .wa-play .mobile-controls button{min-width:56px;min-height:50px;border-radius:17px;font-size:11px}
      }
    `}</style>
  );
}
