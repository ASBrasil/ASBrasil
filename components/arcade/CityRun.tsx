"use client";

// AS City Run - corrida de 3 faixas dentro do hub /universo-as/arcade (Game
// Universe). Substitui o antigo minigame de tela única (RunGame em
// ArcadeUniverse.tsx) por 7 rotas da turnê com progresso permanente salvo no
// banco (ver prisma/schema.prisma::CityRunProgress e
// app/api/public/city-run/progress/route.ts) - mesmo padrão do AS World
// Adventure (components/arcade/WorldAdventure.tsx).
//
// Os obstáculos e ícones do kit recebido são recortes de um board de
// referência com legenda escrita em cima (mesmo problema já visto no kit do
// World Adventure - ver decisão registrada em claude/pendencias-sorteios.md),
// não sprites isolados de verdade. Só os cards de seleção de rota
// (routes/<id>/route.png) são arte de cena real, usados como pôster de cada
// rota na tela de seleção. Os obstáculos em jogo são formas simples
// desenhadas no canvas, com cor e formato variando por rota - ver
// drawObstacle() abaixo.

import { useEffect, useRef, useState } from "react";
import { ROUTE_ORDER, ROUTES, type RouteId, type ObstacleShape } from "@/lib/city-run";

type Character = { id: string; name: string; src: string };

type RouteProgress = {
  id: RouteId; name: string; theme: string; unlocked: boolean;
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
const LANE_X = [170, 360, 550];

function drawObstacle(ctx: CanvasRenderingContext2D, shape: ObstacleShape, x: number, y: number, accent: string) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.32)"; ctx.shadowBlur = 7; ctx.shadowOffsetY = 4;
  if (shape === "bus") {
    ctx.fillStyle = accent; ctx.beginPath(); ctx.roundRect(x - 26, y - 22, 52, 40, 8); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#eaf6ff"; ctx.fillRect(x - 18, y - 15, 36, 12);
    ctx.fillStyle = "#17334a"; ctx.beginPath(); ctx.arc(x - 14, y + 18, 6, 0, 7); ctx.arc(x + 14, y + 18, 6, 0, 7); ctx.fill();
  } else if (shape === "cone") {
    ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(x, y - 26); ctx.lineTo(x + 20, y + 20); ctx.lineTo(x - 20, y + 20); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#fff"; ctx.fillRect(x - 16, y + 4, 32, 6);
  } else if (shape === "drum") {
    ctx.fillStyle = accent; ctx.beginPath(); ctx.ellipse(x, y, 20, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y - 6, 16, 6, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (shape === "umbrella") {
    ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(x - 26, y); ctx.quadraticCurveTo(x, y - 34, x + 26, y); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#8a5a2a"; ctx.fillRect(x - 2, y, 4, 24);
  } else {
    ctx.fillStyle = accent; ctx.beginPath(); ctx.roundRect(x - 24, y - 20, 48, 36, 6); ctx.fill();
    ctx.shadowColor = "transparent";
    for (let i = -18; i < 18; i += 12) { ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(x + i, y - 20, 5, 36); }
  }
  ctx.restore();
}

function CityRunGame({ character, route, onExit, onCleared }: { character: Character; route: RouteId; onExit: () => void; onCleared: (result: { coins: number; elapsedMs: number; cleared: boolean }) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const keys = useKeys();
  const [hud, setHud] = useState({ coins: 0, lives: 3, combo: 1, distance: 0, elapsedMs: 0 });
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    canvas.width=W*2;canvas.height=H*2;ctx.setTransform(2,0,0,2,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
    const cfg = ROUTES[route];

    const runFrames = animFrames(character.id, "run", 3);
    const hitFrames = animFrames(character.id, "hit", 2);

    let lane = 1, coins = 0, lives = 3, combo = 0, maxCombo = 1, invuln = 0;
    let distance = 0, elapsedMs = 0, started = performance.now();
    let raf = 0, last = performance.now(), spawn = 0, ended = false;
    let items: { lane: number; y: number; bad: boolean }[] = [];

    function loop(now: number) {
      const dt = Math.min(35, now - last);
      last = now;
      if (ended) return;
      if (pausedRef.current) { raf = requestAnimationFrame(loop); return; }
      elapsedMs = now - started;

      const speed = 0.22 + Math.min(0.28, distance / 6000);
      distance += dt * speed;
      if (invuln > 0) invuln -= dt;

      if (keys.current.arrowleft || keys.current.a) { lane = Math.max(0, lane - 1); keys.current.arrowleft = keys.current.a = false; }
      if (keys.current.arrowright || keys.current.d) { lane = Math.min(2, lane + 1); keys.current.arrowright = keys.current.d = false; }

      if (now - spawn > Math.max(360, 850 - distance * 0.12)) {
        spawn = now;
        items.push({ lane: Math.floor(Math.random() * 3), y: -40, bad: Math.random() < 0.34 });
      }
      for (const it of items) it.y += dt * (0.22 + Math.min(0.2, distance / 4000));
      items = items.filter((it) => {
        if (it.y > 315 && it.y < 370 && it.lane === lane) {
          if (it.bad) {
            if (invuln <= 0) { lives--; combo = 0; invuln = 900; sfx("hit"); }
          } else {
            combo++; const m = Math.min(5, 1 + Math.floor(combo / 5)); maxCombo = Math.max(maxCombo, m);
            coins++; sfx("pickup");
          }
          return false;
        }
        return it.y < 460;
      });

      const cleared = distance >= cfg.length;
      if (lives <= 0 || cleared) {
        ended = true;
        onCleared({ coins, elapsedMs, cleared });
        return;
      }

      setHud({ coins, lives, combo: Math.min(5, 1 + Math.floor(combo / 5)), distance: Math.min(distance, cfg.length), elapsedMs });

      // --- desenho ---
      ctx.clearRect(0, 0, W, H);
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, cfg.palette.sky); skyGrad.addColorStop(1, "#0b0d1a");
      ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = cfg.palette.road;
      ctx.beginPath(); ctx.moveTo(180, 0); ctx.lineTo(540, 0); ctx.lineTo(690, H); ctx.lineTo(30, H); ctx.fill();
      ctx.strokeStyle = cfg.palette.line; ctx.lineWidth = 3;
      for (let l = 1; l < 3; l++) { ctx.beginPath(); ctx.moveTo(180 + l * 120, 0); ctx.lineTo(30 + l * 220, H); ctx.stroke(); }
      const roadScroll = distance * 3;
      for (let i = 0; i < 14; i++) {
        const y = (i * 55 + roadScroll) % H;
        ctx.strokeStyle = "rgba(255,255,255,.2)"; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      for (const it of items) {
        const px = LANE_X[it.lane];
        if (it.bad) drawObstacle(ctx, cfg.obstacleShape, px, it.y, cfg.palette.accent);
        else { ctx.fillStyle = "#ffd52a"; ctx.beginPath(); ctx.arc(px, it.y, 13, 0, 7); ctx.fill(); ctx.strokeStyle = "#fff4a0"; ctx.stroke(); }
      }
      const state = invuln > 0 ? hitFrames : runFrames;
      ctx.globalAlpha = invuln > 0 ? (Math.floor(now / 90) % 2 ? 0.4 : 1) : 1;
      drawSprite(ctx, state, now, LANE_X[lane] - 39, 298, 78, 78);
      ctx.globalAlpha = 1;

      // Barra de progresso até a linha de chegada.
      const pct = Math.min(1, distance / cfg.length);
      ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(20, 12, W - 40, 6);
      ctx.fillStyle = cfg.palette.accent; ctx.fillRect(20, 12, (W - 40) * pct, 6);

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [character.id, route]);

  const touch = bindTouch(keys);
  const cfg = ROUTES[route];
  const pct = Math.min(100, Math.round((hud.distance / cfg.length) * 100));
  return (
    <div className="cr-play">
      <div className="cr-hud">
        <span className="cr-hud-item">{Array.from({ length: hud.lives }, () => "❤").join("")}</span>
        <span className="cr-hud-item">🪙 {hud.coins}</span>
        <span className="cr-hud-item">🔥 x{hud.combo}</span>
        <span className="cr-hud-item">{pct}%</span>
        <button className="cr-pause" onClick={() => setPaused((p) => !p)}>{paused ? "▶" : "⏸"}</button>
      </div>
      <div className="canvas-wrap"><canvas ref={ref} width={W*2} height={H*2} /></div>
      {paused && (
        <div className="cr-overlay">
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
      </div>
    </div>
  );
}

// --- Componente principal: seleção de rota + resultado ----------------------

export function CityRun({ character, onFinish }: { character: Character; onFinish: (score: number) => void }) {
  const [routes, setRoutes] = useState<RouteProgress[] | null>(null);
  const [active, setActive] = useState<RouteId | null>(null);
  const [result, setResult] = useState<{ route: RouteId; cleared: boolean; stars: number; coins: number } | null>(null);

  function loadProgress() {
    fetch("/api/public/city-run/progress")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setRoutes(data?.routes ?? defaultRoutes()))
      .catch(() => setRoutes(defaultRoutes()));
  }
  useEffect(loadProgress, []);

  function defaultRoutes(): RouteProgress[] {
    return ROUTE_ORDER.map((id, i) => ({ id, name: ROUTES[id].name, theme: ROUTES[id].theme, unlocked: i === 0, cleared: false, stars: 0, bestScore: 0, bestTimeMs: null }));
  }

  async function handleCleared(route: RouteId, r: { coins: number; elapsedMs: number; cleared: boolean }) {
    let stars = 0;
    try {
      const res = await fetch("/api/public/city-run/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route, coins: r.coins, elapsedMs: r.elapsedMs, cleared: r.cleared }),
      });
      if (res.ok) { const data = await res.json(); stars = data.stars ?? 0; onFinish(data.bestScore ?? 0); }
    } catch {}
    setResult({ route, cleared: r.cleared, stars, coins: r.coins });
    setActive(null);
    loadProgress();
  }

  if (active) {
    return (
      <>
        <CityRunGame character={character} route={active} onExit={() => setActive(null)} onCleared={(r) => handleCleared(active, r)} />
        <CityRunStyles />
      </>
    );
  }

  if (result) {
    const cfg = ROUTES[result.route];
    return (
      <div className="cr-result">
        <h2>{result.cleared ? `${cfg.name} concluída!` : "Você perdeu essa"}</h2>
        {result.cleared && <div className="cr-stars">{"⭐".repeat(result.stars)}{"☆".repeat(3 - result.stars)}</div>}
        <p>🪙 {result.coins} moedas coletadas</p>
        <div className="cr-result-actions">
          <button onClick={() => { setResult(null); setActive(result.route); }}>Jogar de novo</button>
          <button onClick={() => setResult(null)}>Voltar pra seleção</button>
        </div>
        <CityRunStyles />
      </div>
    );
  }

  return (
    <div className="cr-select">
      <p className="cr-hint">Escolha uma rota da turnê pra correr com {character.name}</p>
      <div className="cr-routes">
        {(routes ?? defaultRoutes()).map((r) => {
          const locked = !r.unlocked;
          return (
            <button
              key={r.id}
              className={`cr-route ${locked ? "locked" : ""}`}
              style={{ backgroundImage: `url(/game-universe/city-run/routes/${r.id}/route.png)` }}
              disabled={locked}
              onClick={() => setActive(r.id)}
            >
              <div className="cr-route-shade" />
              <div className="cr-route-body">
                <strong>{r.name}</strong>
                <span>{r.theme}</span>
                {r.cleared && <div className="cr-stars small">{"⭐".repeat(r.stars)}{"☆".repeat(3 - r.stars)}</div>}
                {locked && <span className="cr-lock">🔒 Complete a rota anterior</span>}
                {!locked && <span className="cr-go">CORRER →</span>}
              </div>
            </button>
          );
        })}
      </div>
      <CityRunStyles />
    </div>
  );
}

function CityRunStyles() {
  return (
    <style jsx global>{`
      .cr-hint{color:#b9c3df;text-align:center;margin:4px 0 16px}
      .cr-routes{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;max-width:960px;margin:0 auto}
      .cr-route{position:relative;height:240px;border-radius:18px;border:1px solid #2c3a62;background-size:cover;background-position:center;overflow:hidden;cursor:pointer;padding:0}
      .cr-route:disabled{cursor:not-allowed}
      .cr-route-shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,#0009 100%)}
      .cr-route.locked .cr-route-shade{background:#000a}
      .cr-route-body{position:absolute;left:0;right:0;bottom:0;padding:10px;display:flex;flex-direction:column;gap:2px;text-align:left;color:#fff}
      .cr-route-body strong{font-size:14px}
      .cr-route-body span{font-size:11px;color:#dbe3ff}
      .cr-lock{font-size:10px;color:#ffd23f;margin-top:4px}
      .cr-go{font-size:10px;color:#7ce7ff;margin-top:4px;font-weight:700}
      .cr-stars{font-size:15px;color:#ffd52a}
      .cr-stars.small{font-size:12px}
      .cr-result{max-width:420px;margin:40px auto;text-align:center;color:#fff}
      .cr-result-actions{display:flex;gap:10px;justify-content:center;margin-top:16px}
      .cr-result-actions button{background:#172341;border:1px solid #405180;color:#fff;border-radius:12px;padding:10px 16px;font-weight:700}
      .arcade-shell:has(.cr-play){padding:0!important;overflow:hidden;background:#050914}
      .arcade-shell:has(.cr-play) .game-head{position:fixed;z-index:40;top:14px;left:14px;right:14px;max-width:none;margin:0;pointer-events:none}
      .arcade-shell:has(.cr-play) .game-head button{pointer-events:auto;background:rgba(5,11,27,.62);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(14px);box-shadow:0 8px 30px #0005}
      .arcade-shell:has(.cr-play) .game-head div{display:none}
      .arcade-shell:has(.cr-play) .game-head img{margin-left:auto;width:48px;height:48px;padding:5px;border-radius:16px;background:rgba(5,11,27,.58);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(14px)}
      .cr-play{position:relative;width:100vw;height:100dvh;overflow:hidden;background:radial-gradient(circle at 50% 30%,#1c2b5c 0%,#0e1638 48%,#050914 100%);display:flex;align-items:center;justify-content:center}
      .cr-play .canvas-wrap{position:relative;width:min(100vw,calc(100dvh * 12 / 7));height:min(100dvh,calc(100vw * 7 / 12));padding:0!important;border:0!important;border-radius:16px!important;background:#050914!important;overflow:hidden;box-shadow:0 0 0 2px rgba(79,95,255,.55),0 0 46px 8px rgba(79,95,255,.3),0 30px 80px rgba(0,0,0,.55)!important}
      .cr-play .canvas-wrap canvas{display:block;width:100%!important;height:100%!important;max-height:none!important;object-fit:fill!important;border-radius:inherit!important}
      .cr-play .cr-hud{position:absolute;z-index:12;top:16px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:7px;padding:7px 9px;background:rgba(5,11,27,.58);border:1px solid rgba(255,255,255,.18);border-radius:999px;backdrop-filter:blur(14px);box-shadow:0 10px 34px #0005}
      .cr-hud-item{color:#fff;font-weight:800;font-size:13px;line-height:1;padding:7px 9px;border-radius:999px;background:rgba(255,255,255,.08);text-shadow:0 2px 8px #000}
      .cr-pause{margin-left:0;width:34px;height:34px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:#fff;border-radius:50%;display:grid;place-items:center}
      .cr-play .mobile-controls{position:absolute;z-index:14;left:18px;right:18px;bottom:max(18px,env(safe-area-inset-bottom));display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:0}
      .cr-play .mobile-controls button{min-width:64px;min-height:54px;border:1px solid rgba(255,255,255,.24);background:rgba(5,11,27,.48);color:#fff;border-radius:20px;font-weight:900;backdrop-filter:blur(12px);box-shadow:0 10px 30px #0005;text-shadow:0 2px 8px #000}
      .cr-play .mobile-controls button:active{transform:scale(.94);background:rgba(85,104,255,.62)}
      .cr-overlay{position:absolute;z-index:30;inset:0;background:rgba(2,6,18,.72);backdrop-filter:blur(12px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff;border-radius:0}
      .cr-overlay button{background:#172341;border:1px solid #405180;color:#fff;border-radius:12px;padding:10px 18px;font-weight:700}
      @media(max-width:720px){
        .cr-routes{grid-template-columns:repeat(2,1fr)}
        .arcade-shell:has(.cr-play) .game-head{top:8px;left:8px;right:8px}
        .arcade-shell:has(.cr-play) .game-head img{display:none}
        .cr-play .cr-hud{top:8px;left:auto;right:8px;transform:none;gap:3px;padding:4px}
        .cr-hud-item{font-size:11px;padding:6px}
        .cr-play .mobile-controls{left:10px;right:10px;bottom:max(10px,env(safe-area-inset-bottom))}
        .cr-play .mobile-controls button{min-width:56px;min-height:50px;border-radius:17px;font-size:11px}
      }
    `}</style>
  );
}
