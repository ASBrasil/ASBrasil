"use client";

import { useState } from "react";
import { WorldAdventure } from "./WorldAdventure";
import { CityRun } from "./CityRun";
import { NeonMaze } from "./NeonMaze";
import { BlastArena } from "./BlastArena";
import { ArcadeSocial } from "./ArcadeSocial";

// Hub do Universo AS (01/10) - deixou de ter jogos fixos no código e virou
// data-driven: `games` vem do catálogo por experiência (UniverseGame em
// prisma/schema.prisma), gerenciável no admin em Jogos → 🕹️ Universo AS.
// `engine` é qual dos 4 motores de jogo já construídos essa entrada do
// catálogo usa.
//
// Personagens + Loja (02/10): `characters` vem do elenco de Personagens da
// Experiência (model Character/PlayerCharacter, editável em Experiências →
// [a experiência] → Personagens) - cada um já chega sabendo se a pessoa
// `owned` (desbloqueou) ou não. No hub só aparece uma barra compacta com o
// personagem ativo + um botão "Trocar personagem", que abre a tela cheia
// da Loja (`pickerOpen`) com TODO o elenco (desbloqueados e bloqueados)
// clicável: clicar num desbloqueado troca na hora, clicar num bloqueado
// arma a compra (confirma com um segundo clique) e gasta moeda
// (`pointsCost`, ver CoinEntry no schema). Ao desbloquear, o personagem
// também vira um "card" na tela Coleção de Personagens (/universo-as, ver
// Character.cardImageUrl).
// IMPORTANTE: os esqueletos de animação (`spriteId`, ver
// public/game-universe/animated) são texto livre no admin - hoje só os 7
// dos idols existem prontos, mas vários personagens/peles do elenco podem
// reaproveitar o mesmo, só a imagem/nome mostrados fora do jogo mudam (ver
// FALLBACK_SPRITE_ID e a função Game() mais abaixo). Um personagem com
// moveset 100% próprio (e animado, tipo "bater asa") precisa de uma arte
// nova desse formato - ver comentário na função Game().
export type UniverseEngine = "WORLD" | "MAZE" | "BLAST" | "CITYRUN";
export interface UniverseGameData {
  id: string;
  engine: UniverseEngine;
  title: string;
  description: string;
  tag: string;
  coverImageUrl: string | null;
}
export interface UniverseCharacterData {
  id: string;
  name: string;
  imageUrl: string | null;
  rarity: string;
  spriteId: string | null;
  pointsCost: number;
  owned: boolean;
}

const FALLBACK_CHARACTER: UniverseCharacterData = {
  id: "_none",
  name: "Convidado",
  imageUrl: null,
  rarity: "comum",
  spriteId: null,
  pointsCost: 0,
  owned: true,
};
// Esqueleto de animação padrão quando o personagem ainda não tem um
// configurado no admin - nunca deixa o personagem "sumir" em jogo (era
// exatamente esse o bug do catálogo antigo, UniverseCharacter).
const FALLBACK_SPRITE_ID = "rm";

export function ArcadeUniverse({
  games,
  characters: initialCharacters,
  coinBalance: initialCoinBalance,
  canBuy,
}: {
  games: UniverseGameData[];
  characters: UniverseCharacterData[];
  coinBalance: number;
  canBuy: boolean;
}) {
  const [gameId, setGameId] = useState<string | null>(null);
  const [socialOpen, setSocialOpen] = useState(false);
  // Loja/seleção de personagem (02/10) - virou uma tela própria, igual
  // activeGame/socialOpen, em vez de ficar sempre visível no hub (pedido do
  // Paulo: "a pessoa vê com qual personagem vai jogar e escolhe um outro,
  // aí ele entra na loja pra escolher"). Ver a seção `if (pickerOpen)`.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [roster, setRoster] = useState(initialCharacters);
  const [coinBalance, setCoinBalance] = useState(initialCoinBalance);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  // Clicar num personagem bloqueado arma a compra (mostra "confirmar?"); um
  // segundo clique no MESMO card confirma - evita gastar moeda sem querer
  // com um toque só, já que agora o card inteiro é clicável.
  const [confirmBuyId, setConfirmBuyId] = useState<string | null>(null);
  // Personagem que acabou de ser desbloqueado agora mesmo - só pra tocar a
  // animação de "revelação do card" (classe .revealing) uma vez.
  const [revealId, setRevealId] = useState<string | null>(null);
  const owned = roster.filter((c) => c.owned);
  const [character, setCharacter] = useState<UniverseCharacterData>(owned[0] ?? FALLBACK_CHARACTER);
  const [best, setBest] = useState<Record<string, number>>({});
  function finish(id: string, score: number) {
    setBest((b) => ({ ...b, [id]: Math.max(b[id] ?? 0, score) }));
  }

  function equip(c: UniverseCharacterData) {
    setCharacter(c);
    setPickerOpen(false);
  }

  async function unlock(target: UniverseCharacterData) {
    if (unlockingId) return;
    setUnlockingId(target.id);
    setUnlockError(null);
    try {
      const res = await fetch(`/api/public/characters/${target.id}/unlock`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setUnlockError(data.error || "Não deu pra desbloquear esse personagem.");
        setConfirmBuyId(null);
        return;
      }
      setCoinBalance(data.balance);
      setRoster((r) => r.map((c) => (c.id === target.id ? { ...c, owned: true } : c)));
      setConfirmBuyId(null);
      setRevealId(target.id);
      setCharacter({ ...target, owned: true });
    } finally {
      setUnlockingId(null);
    }
  }

  /** Clique no card do personagem, na tela da Loja/seleção (pickerOpen). */
  function handleCardClick(c: UniverseCharacterData) {
    if (c.owned) {
      equip(c);
      return;
    }
    if (!canBuy) {
      setUnlockError("Entre com seu e-mail do Universo AS pra comprar personagens.");
      return;
    }
    if (confirmBuyId === c.id) {
      unlock(c);
    } else {
      setUnlockError(null);
      setConfirmBuyId(c.id);
    }
  }

  const activeGame = games.find((g) => g.id === gameId) ?? null;

  if (socialOpen)
    return (
      <div className="arcade-shell">
        <header className="game-head">
          <button onClick={() => setSocialOpen(false)}>← HUB</button>
          <div>
            <strong>👥 Amigos & Salas</strong>
            <span>{character.name}</span>
          </div>
          <CharacterPortrait character={character} size={54} />
        </header>
        <ArcadeSocial character={{ id: character.id, name: character.name, src: character.imageUrl ?? "" }} />
        <ArcadeStyles />
      </div>
    );

  if (activeGame)
    return (
      <div className="arcade-shell">
        <header className="game-head">
          <button onClick={() => setGameId(null)}>← HUB</button>
          <div>
            <strong>{activeGame.title}</strong>
            <span>{character.name}</span>
          </div>
          <CharacterPortrait character={character} size={54} />
        </header>
        <Game engine={activeGame.engine} character={character} onFinish={(s) => finish(activeGame.id, s)} />
        <ArcadeStyles />
      </div>
    );

  if (pickerOpen)
    return (
      <div className="arcade-shell">
        <header className="game-head">
          <button
            onClick={() => {
              setPickerOpen(false);
              setConfirmBuyId(null);
              setUnlockError(null);
            }}
          >
            ← HUB
          </button>
          <div>
            <strong>Escolha seu personagem</strong>
            <span>
              {owned.length}/{roster.length} desbloqueados
            </span>
          </div>
          {canBuy && <span className="coin-badge">🪙 {coinBalance}</span>}
        </header>
        {!canBuy && (
          <p className="shop-hint centered">
            Entre com seu e-mail do Universo AS pra juntar moedas jogando e desbloquear personagens
            novos.
          </p>
        )}
        {unlockError && <p className="shop-error centered">{unlockError}</p>}
        <section className="picker-full">
          <div className="characters">
            {roster.map((c) => {
              const isActive = c.id === character.id;
              const confirming = confirmBuyId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={["char", c.owned ? "" : "locked", isActive ? "active" : "", revealId === c.id ? "revealing" : ""]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleCardClick(c)}
                  onAnimationEnd={() => revealId === c.id && setRevealId(null)}
                >
                  <div className="char-portrait">
                    <CharacterPortrait character={c} size={98} />
                    {!c.owned && !confirming && <span className="price-badge">🪙 {c.pointsCost}</span>}
                    {isActive && <span className="active-badge">ATIVO</span>}
                  </div>
                  <span>{c.name}</span>
                  {!c.owned && confirming && (
                    <span className="confirm-badge">
                      {unlockingId === c.id ? "comprando…" : `confirmar? 🪙 ${c.pointsCost}`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
        <ArcadeStyles />
      </div>
    );

  return (
    <div className="arcade-shell">
      <section className="arcade-hero">
        <div>
          <span className="eyebrow">AS BRASIL • GAME UNIVERSE</span>
          <h1>
            Escolha seu mundo.
            <br />
            <em>Entre no jogo.</em>
          </h1>
          <p>
            {games.length} {games.length === 1 ? "experiência" : "experiências"} conectadas
            {roster.length > 0 ? `, ${roster.length} personagens pra colecionar` : ""} e novos desafios
            em cada universo.
          </p>
          <div className="hero-chips">
            <span>
              {games.length} {games.length === 1 ? "JOGO" : "JOGOS"}
            </span>
            {roster.length > 0 && (
              <span>
                {owned.length}/{roster.length} PERSONAGENS
              </span>
            )}
            {canBuy && <span>🪙 {coinBalance} MOEDAS</span>}
            <span>PROGRESSO SALVO</span>
          </div>
        </div>
        <div className="hero-orb">
          <b>AS</b>
          <small>GAME UNIVERSE</small>
        </div>
      </section>

      {roster.length > 0 && (
        <section className="picker current-character-bar">
          <div className="current-char">
            <div className="current-char-avatar">
              <CharacterPortrait character={character} size={56} />
            </div>
            <div className="current-char-info">
              <small>SEU PERSONAGEM</small>
              <b>{character.name}</b>
            </div>
            <button type="button" className="swap-btn" onClick={() => setPickerOpen(true)}>
              Trocar personagem →
            </button>
          </div>
        </section>
      )}

      <section className="social-cta">
        <button onClick={() => setSocialOpen(true)}>👥 Amigos & Salas - jogue e compare com quem você conhece</button>
      </section>

      {games.length > 0 ? (
        <section className="game-grid">
          {games.map((g, i) => (
            <button key={g.id} className="game-card" onClick={() => setGameId(g.id)}>
              {g.coverImageUrl ? (
                <img className="game-cover" src={g.coverImageUrl} alt="" />
              ) : (
                <span className="game-cover game-cover-placeholder" />
              )}
              <span className="game-shade" />
              <span className="game-number">0{i + 1}</span>
              <div className="game-copy">
                {g.tag && <small>{g.tag}</small>}
                <h3>{g.title}</h3>
                <p>{g.description}</p>
                <span>
                  RECORDE <b>{best[g.id] ?? 0}</b>
                </span>
              </div>
              <strong className="play-cta">JOGAR →</strong>
            </button>
          ))}
        </section>
      ) : (
        <p className="empty">Nenhum jogo disponível por aqui no momento. Volte em breve!</p>
      )}
      <ArcadeStyles />
    </div>
  );
}

function CharacterPortrait({ character, size }: { character: UniverseCharacterData; size: number }) {
  if (!character.imageUrl) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.4,
        }}
      >
        🎮
      </div>
    );
  }
  return <img src={character.imageUrl} alt={character.name} width={size} height={size} style={{ objectFit: "contain" }} />;
}

/**
 * Pra um personagem ter moveset 100% próprio (ex: um bichinho que bate asa
 * de verdade enquanto joga, não só uma imagem parada) é preciso existir
 * uma pasta de sprites animados pra ele, no mesmo formato dos 7 que já
 * existem (ver public/game-universe/animated/<nome>): PNGs individuais,
 * fundo 100% transparente, um por frame, nomeados
 * `<estado>_<NN>.png` (ex: idle_00.png, idle_01.png) - os estados que o
 * jogo usa são idle (2 frames), run (3 frames), jump (4 frames, só World
 * Adventure), slide (2 frames, só World Adventure) e hit (2 frames). Isso é
 * conteúdo de arte (não dá pra gerar por código aqui) - quando o Paulo
 * tiver um personagem em mente, é só pedir que eu escrevo o prompt pro
 * gerador de imagens, do mesmo jeito que fizemos pros inimigos do World
 * Adventure Rio. Depois de pronto: sobe os PNGs nessa pasta e escreve o
 * nome dela no campo "Esqueleto de animação" do personagem, no admin.
 */
function Game({
  engine,
  character,
  onFinish,
}: {
  engine: UniverseEngine;
  character: UniverseCharacterData;
  onFinish: (s: number) => void;
}) {
  // O moveset em jogo sempre vem do esqueleto configurado (spriteId), nunca
  // do id do personagem no banco (ver comentário no topo do arquivo) - é
  // isso que faz qualquer personagem do elenco, mesmo sem sprite próprio
  // ainda, aparecer e se mover em jogo em vez de ficar "invisível".
  const c = { id: character.spriteId || FALLBACK_SPRITE_ID, name: character.name, src: character.imageUrl ?? "" };
  if (engine === "WORLD") return <WorldAdventure character={c} onFinish={onFinish} />;
  if (engine === "MAZE") return <NeonMaze character={c} onFinish={onFinish} />;
  if (engine === "BLAST") return <BlastArena character={c} onFinish={onFinish} />;
  return <CityRun character={c} onFinish={onFinish} />;
}

// AS World Adventure (engine "WORLD") - components/arcade/WorldAdventure.tsx -
// 3 cidades com progresso permanente, ver ArcadeProgress em prisma/schema.prisma.

// AS Neon Maze (engine "MAZE") - components/arcade/NeonMaze.tsx - 8 mundos
// por era/álbum do BTS com progresso permanente, ver NeonMazeProgress em
// prisma/schema.prisma.

// AS Blast Arena (engine "BLAST") - components/arcade/BlastArena.tsx - 12
// arenas por era/álbum do BTS com progresso permanente, ver
// BlastArenaProgress em prisma/schema.prisma.

// AS City Run (engine "CITYRUN") - components/arcade/CityRun.tsx - 7 rotas
// da turnê com progresso permanente, ver CityRunProgress em
// prisma/schema.prisma.

function ArcadeStyles(){return <style jsx global>{`
.arcade-shell{min-height:100vh;background:radial-gradient(circle at 12% -8%,#193d6c 0,transparent 34%),radial-gradient(circle at 92% 5%,#391b5d 0,transparent 30%),linear-gradient(180deg,#07111f,#050813 60%,#03050b);color:#fff;padding:28px 24px 56px;font-family:Inter,system-ui,sans-serif;overflow-x:hidden}.arcade-hero{position:relative;max-width:1180px;margin:auto;min-height:300px;display:flex;align-items:center;justify-content:space-between;padding:44px 30px;border:1px solid #ffffff16;border-radius:34px;background:linear-gradient(120deg,#0a2038e8,#10152ee8 58%,#25113cd6);overflow:hidden;box-shadow:0 30px 90px #0008}.arcade-hero h1{font-size:clamp(44px,6vw,76px);line-height:.93;letter-spacing:-.055em;margin:12px 0 17px;color:#fff}.arcade-hero h1 em{font-style:normal;background:linear-gradient(90deg,#63e4ff,#ad8aff,#ff77b8);-webkit-background-clip:text;color:transparent}.arcade-hero p{color:#b8c8dc;max-width:610px;font-size:16px;line-height:1.6}.eyebrow{font-size:10px;font-weight:900;letter-spacing:.28em;color:#69ddff}.hero-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}.hero-chips span{font-size:8px;font-weight:900;letter-spacing:.1em;padding:7px 10px;border:1px solid #ffffff1c;border-radius:99px;background:#ffffff08}.hero-orb{width:170px;height:170px;flex:0 0 170px;border-radius:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(145deg,#1c7dba,#5741c6 55%,#d13c91);box-shadow:0 0 0 1px #ffffff30,0 30px 80px #4f5fff55;transform:rotate(7deg)}.hero-orb b{font-size:52px;letter-spacing:-.08em}.hero-orb small{font-size:8px;font-weight:900;letter-spacing:.16em}.picker,.game-grid,.social-cta{max-width:1180px;margin:28px auto 0}.social-cta button{width:100%;background:linear-gradient(145deg,#1d2c56,#141e39);border:1px solid #405180;color:#dfe6ff;border-radius:18px;padding:14px 20px;font-weight:700;text-align:left;cursor:pointer}.social-cta button:hover{border-color:#7184ff}.empty{max-width:1180px;margin:28px auto;color:#9faed1}.section-title{display:flex;align-items:end;justify-content:space-between;margin:0 2px 14px}.section-title small{font-size:9px;color:#65dcff;font-weight:900;letter-spacing:.2em}.section-title h2{font-size:24px;margin:4px 0 0}.section-title>b{font-size:11px;padding:8px 12px;border-radius:99px;background:#ffffff0b;border:1px solid #ffffff16}.characters{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}.char{min-width:0;background:linear-gradient(180deg,#13233b,#0b1325);border:1px solid #ffffff14;color:#fff;border-radius:20px;padding:8px;cursor:pointer;transition:.2s}.char:hover{transform:translateY(-3px);border-color:#5bdcff66}.char.active{border-color:#63ddff;box-shadow:0 0 0 2px #63ddff20,0 14px 34px #0ad0ff18}.char-portrait{height:112px;border-radius:14px;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle,#294c6d,#0a1527 72%)}.char img{width:98px;height:98px;object-fit:contain;display:block;filter:contrast(1.06) saturate(.94)}.char span{display:block;font-size:12px;font-weight:800;margin-top:8px}.game-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.game-card{position:relative;text-align:left;height:300px;border:1px solid #ffffff18;border-radius:28px;background:#0b1324;color:#fff;padding:0;overflow:hidden;cursor:pointer;box-shadow:0 18px 48px #0005;transition:.25s}.game-card:hover{transform:translateY(-5px);border-color:#71dcff66}.game-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:.5s}.game-cover-placeholder{background:linear-gradient(145deg,#1c3156,#0b1324)}.game-card:hover .game-cover{transform:scale(1.035)}.game-shade{position:absolute;inset:0;background:linear-gradient(180deg,#02081708 10%,#06101d55 46%,#030813f7 100%)}.game-number{position:absolute;top:17px;right:18px;font-size:10px;font-weight:900;letter-spacing:.15em;padding:7px 9px;border-radius:9px;background:#06101daa;border:1px solid #ffffff20}.game-copy{position:absolute;z-index:2;left:21px;right:21px;bottom:20px}.game-copy>small{font-size:9px;font-weight:900;letter-spacing:.18em;color:#6de5ff}.game-copy h3{margin:5px 0 6px;font-size:25px}.game-copy p{max-width:72%;margin:0 0 11px;color:#bdc9d9;font-size:12px}.game-copy>span{font-size:9px;color:#8799b1}.game-copy>span b{color:#ffe36b}.play-cta{position:absolute;z-index:3;right:18px;bottom:18px;font-size:9px;letter-spacing:.08em;padding:10px 12px;border-radius:11px;background:#147fb0dd;border:1px solid #65dfff55}.game-head{max-width:900px;margin:0 auto 14px;display:flex;align-items:center;gap:16px}.game-head button{background:#141e39;border:1px solid #30416c;color:#fff;border-radius:14px;padding:12px 16px}.game-head div{flex:1}.game-head strong,.game-head span{display:block}.game-head span{font-size:12px;color:#9faed1}.game-head img{width:54px;height:54px;object-fit:contain}.game-frame{max-width:820px;margin:auto}.hud{display:flex;justify-content:space-between;gap:10px;padding:12px 16px;background:#111a31;border:1px solid #2c3a62;border-radius:18px 18px 0 0}.hud span{color:#9eabd0;font-size:13px}.canvas-wrap{background:linear-gradient(145deg,#050711,#101a35);box-shadow:0 25px 80px #0008;padding:12px;border:1px solid #2c3a62;border-top:0;border-radius:0 0 18px 18px}.canvas-wrap canvas{display:block;width:100%;height:auto;max-height:68vh;object-fit:contain;border-radius:10px;touch-action:none;image-rendering:auto}.mobile-controls{display:flex;justify-content:space-between;gap:10px;margin-top:10px}.mobile-controls div{display:flex;gap:8px;flex-wrap:wrap}.mobile-controls button{min-width:58px;min-height:48px;border:1px solid #405180;background:#172341;color:white;border-radius:14px;font-weight:800;touch-action:none}@media(max-width:820px){.arcade-shell{padding:12px 12px 34px}.arcade-hero{min-height:0;padding:34px 20px}.hero-orb{display:none}.characters{display:flex;overflow:auto;padding-bottom:8px}.char{min-width:112px}.game-grid{grid-template-columns:1fr}.game-card{height:265px}.arcade-hero h1{font-size:44px}.game-head{margin-top:8px}}@media(max-width:480px){.game-card{height:230px;border-radius:22px}.game-copy p{display:none}.social-cta button{font-size:11px}}
.shop-hint{color:#9faed1;font-size:12px;margin:-4px 2px 12px}
.shop-hint.centered,.shop-error.centered{max-width:1180px;margin:14px auto 0;text-align:center}
.shop-error{color:#ff8a8a;font-size:12px;margin:-4px 2px 12px;font-weight:700}
.char.locked{cursor:pointer;display:flex;flex-direction:column}
.char.locked .char-portrait{filter:grayscale(1) brightness(.5)}
.char.locked span{opacity:.75}
.current-character-bar{padding:14px 20px}
.current-char{display:flex;align-items:center;gap:14px}
.current-char-avatar{width:64px;height:64px;border-radius:16px;background:radial-gradient(circle,#294c6d,#0a1527 72%);display:grid;place-items:center;overflow:hidden;flex-shrink:0}
.current-char-info{flex:1;min-width:0}
.current-char-info small{display:block;font-size:9px;font-weight:900;letter-spacing:.2em;color:#65dcff;margin-bottom:2px}
.current-char-info b{font-size:17px}
.swap-btn{flex-shrink:0;background:linear-gradient(145deg,#1d2c56,#141e39);border:1px solid #405180;color:#dfe6ff;border-radius:14px;padding:10px 16px;font-weight:800;font-size:12px;cursor:pointer}
.swap-btn:hover{border-color:#7184ff}
.coin-badge{font-size:12px;font-weight:900;padding:8px 14px;border-radius:999px;background:#ffffff0b;border:1px solid #ffffff16;color:#ffe9a8;flex-shrink:0}
.picker-full{max-width:1180px;margin:18px auto 0}
.char-portrait{position:relative}
.price-badge{position:absolute;bottom:6px;right:6px;font-size:10px;font-weight:900;padding:3px 7px;border-radius:999px;background:#2a2109dd;border:1px solid #ffd76655;color:#ffe9a8}
.active-badge{position:absolute;top:6px;left:6px;font-size:9px;font-weight:900;padding:3px 7px;border-radius:999px;background:#0ad0ffdd;color:#021321;letter-spacing:.05em}
.confirm-badge{display:block;margin-top:6px;font-size:10px;font-weight:800;color:#ffe9a8;background:#4a3a1255;border-radius:8px;padding:4px 6px}
.char.revealing{animation:charReveal .7s ease}
@keyframes charReveal{0%{transform:scale(.7) rotateY(90deg);filter:brightness(2) saturate(1.6)}60%{transform:scale(1.08) rotateY(0deg);filter:brightness(1.3)}100%{transform:scale(1) rotateY(0deg);filter:brightness(1)}}
@media(max-width:820px){.current-char{flex-wrap:wrap}.swap-btn{width:100%}}
`}</style>}
