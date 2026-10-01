"use client";

import { useState } from "react";
import { WorldAdventure } from "./WorldAdventure";
import { CityRun } from "./CityRun";
import { NeonMaze } from "./NeonMaze";
import { BlastArena } from "./BlastArena";
import { ArcadeSocial } from "./ArcadeSocial";

type GameId = "world" | "maze" | "blast" | "run";
type Character = { id:string; name:string; src:string };
const CHARS: Character[] = [
  ["rm","RM"],["jin","Jin"],["suga","Suga"],["jhope","J-Hope"],["jimin","Jimin"],["v","V"],["jungkook","Jungkook"]
].map(([id,name])=>({id,name,src:`/game-universe/characters/${id}.png`}));
const GAMES:{id:GameId;title:string;desc:string;icon:string}[]=[
  {id:"world",title:"AS World Adventure",desc:"Plataforma, moedas, mundos e inimigos.",icon:"🏰"},
  {id:"maze",title:"AS Neon Maze",desc:"Labirintos, coleta e perseguição.",icon:"🌀"},
  {id:"blast",title:"AS Blast Arena",desc:"Bombas, estratégia e blocos destrutíveis.",icon:"💥"},
  {id:"run",title:"AS City Run",desc:"Corrida infinita, obstáculos e combos.",icon:"⚡"},
];

export function ArcadeUniverse({visibleGames}:{visibleGames?:GameId[]}={}){
  const [game,setGame]=useState<GameId|null>(null);
  const [socialOpen,setSocialOpen]=useState(false);
  const [character,setCharacter]=useState(CHARS[0]);
  const [best,setBest]=useState<Record<GameId,number>>({world:0,maze:0,blast:0,run:0});
  function finish(id:GameId,score:number){ setBest(b=>({...b,[id]:Math.max(b[id],score)})); }
  // Sem a prop (uso avulso do componente) mantém o comportamento de antes:
  // os 4 jogos aparecem. Vindo da página /universo-as/arcade, o Server
  // Component já filtrou por visibilidade - ver ArcadeGameSetting.
  const games = visibleGames ? GAMES.filter(g=>visibleGames.includes(g.id)) : GAMES;
  if(socialOpen) return <div className="arcade-shell"><header className="game-head"><button onClick={()=>setSocialOpen(false)}>← HUB</button><div><strong>👥 Amigos & Salas</strong><span>{character.name}</span></div><img src={character.src} alt=""/></header><ArcadeSocial character={character}/><ArcadeStyles/></div>;
  if(game) return <div className="arcade-shell"><GameHeader game={game} character={character} onBack={()=>setGame(null)}/><Game game={game} character={character} onFinish={s=>finish(game,s)}/><ArcadeStyles/></div>;
  return <div className="arcade-shell">
    <section className="arcade-hero"><div><span className="eyebrow">UNIVERSO AS</span><h1>Game Universe</h1><p>Quatro experiências, sete personagens e uma única central de diversão.</p></div><div className="hero-orb">AS</div></section>
    <section className="picker"><h2>Escolha seu personagem</h2><div className="characters">{CHARS.map(c=><button key={c.id} className={character.id===c.id?"char active":"char"} onClick={()=>setCharacter(c)}><img src={c.src} alt=""/><span>{c.name}</span></button>)}</div></section>
    <section className="social-cta"><button onClick={()=>setSocialOpen(true)}>👥 Amigos & Salas - jogue e compare com quem você conhece</button></section>
    {games.length>0
      ? <section className="game-grid">{games.map(g=><button key={g.id} className="game-card" onClick={()=>setGame(g.id)}><span className="game-icon">{g.icon}</span><div><h3>{g.title}</h3><p>{g.desc}</p><small>Recorde: {best[g.id]}</small></div><b>JOGAR →</b></button>)}</section>
      : <p className="empty">Nenhum jogo disponível por aqui no momento. Volte em breve!</p>}
    <ArcadeStyles/>
  </div>
}
function GameHeader({game,character,onBack}:{game:GameId;character:Character;onBack:()=>void}){const g=GAMES.find(x=>x.id===game)!;return <header className="game-head"><button onClick={onBack}>← HUB</button><div><strong>{g.icon} {g.title}</strong><span>{character.name}</span></div><img src={character.src} alt=""/></header>}
function Game({game,character,onFinish}:{game:GameId;character:Character;onFinish:(s:number)=>void}){if(game==="world")return <WorldAdventure character={character} onFinish={onFinish}/>;if(game==="maze")return <NeonMaze character={character} onFinish={onFinish}/>;if(game==="blast")return <BlastArena character={character} onFinish={onFinish}/>;return <CityRun character={character} onFinish={onFinish}/>}

// AS World Adventure (id "world") mudou pra components/arcade/WorldAdventure.tsx -
// 3 cidades com progresso permanente, ver ArcadeProgress em prisma/schema.prisma.
// O antigo minigame de uma faixa só saiu daqui.

// AS Neon Maze (id "maze") mudou pra components/arcade/NeonMaze.tsx - 8 mundos
// por era/álbum do BTS com progresso permanente, ver NeonMazeProgress em
// prisma/schema.prisma. O antigo minigame de labirinto único saiu daqui.

// AS Blast Arena (id "blast") mudou pra components/arcade/BlastArena.tsx - 12
// arenas por era/álbum do BTS com progresso permanente, ver
// BlastArenaProgress em prisma/schema.prisma. O antigo minigame de arena
// única saiu daqui.

// AS City Run (id "run") mudou pra components/arcade/CityRun.tsx - 7 rotas
// da turnê com progresso permanente, ver CityRunProgress em
// prisma/schema.prisma. O antigo minigame de tela única saiu daqui.

function ArcadeStyles(){return <style jsx global>{`
.arcade-shell{min-height:100vh;background:radial-gradient(circle at 20% 0,#23366c 0,#0b1022 45%,#050711 100%);color:#fff;padding:24px;font-family:Inter,system-ui,sans-serif}.arcade-hero{max-width:1100px;margin:auto;display:flex;align-items:center;justify-content:space-between;padding:38px 8px}.arcade-hero h1{font-size:clamp(42px,7vw,82px);line-height:.9;margin:8px 0;background:linear-gradient(90deg,#fff,#82d8ff,#ff7fc8);-webkit-background-clip:text;color:transparent}.arcade-hero p{color:#b9c3df;max-width:620px}.eyebrow{font-size:12px;letter-spacing:.3em;color:#7ce7ff}.hero-orb{width:120px;height:120px;border-radius:35px;display:grid;place-items:center;font-size:42px;font-weight:900;background:linear-gradient(135deg,#4f5fff,#ff4fa3);box-shadow:0 0 60px #4f5fff66;transform:rotate(8deg)}.picker,.game-grid,.social-cta{max-width:1100px;margin:0 auto 26px}.social-cta button{width:100%;background:linear-gradient(145deg,#1d2c56,#141e39);border:1px solid #405180;color:#dfe6ff;border-radius:18px;padding:14px 20px;font-weight:700;text-align:left;cursor:pointer}.social-cta button:hover{border-color:#7184ff}.empty{max-width:1100px;margin:0 auto 26px;color:#9faed1;font-size:14px}.picker h2{font-size:16px;color:#dfe6ff}.characters{display:flex;gap:10px;overflow:auto;padding:6px 2px 14px}.char{min-width:90px;background:#111a34;border:1px solid #28365e;color:#fff;border-radius:18px;padding:8px;cursor:pointer}.char.active{border-color:#74e7ff;box-shadow:0 0 0 2px #74e7ff33}.char img{width:64px;height:64px;object-fit:contain;display:block;margin:auto}.char span{font-size:12px}.game-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.game-card{text-align:left;min-height:170px;border:1px solid #29375e;border-radius:26px;background:linear-gradient(145deg,#131d3a,#0c1329);color:#fff;padding:22px;display:grid;grid-template-columns:72px 1fr auto;align-items:center;gap:14px;cursor:pointer}.game-card:hover{border-color:#7184ff;transform:translateY(-2px)}.game-card h3{margin:0 0 6px;font-size:22px}.game-card p{margin:0 0 12px;color:#9faed1}.game-card small{color:#ffe56d}.game-icon{font-size:50px}.game-card b{font-size:12px;color:#7ce7ff}.game-head{max-width:900px;margin:0 auto 14px;display:flex;align-items:center;gap:16px}.game-head button{background:#141e39;border:1px solid #30416c;color:#fff;border-radius:14px;padding:12px 16px}.game-head div{flex:1}.game-head strong,.game-head span{display:block}.game-head span{font-size:12px;color:#9faed1}.game-head img{width:54px;height:54px;object-fit:contain}.game-frame{max-width:820px;margin:auto}.hud{display:flex;justify-content:space-between;gap:10px;padding:12px 16px;background:#111a31;border:1px solid #2c3a62;border-radius:18px 18px 0 0}.hud span{color:#9eabd0;font-size:13px}.canvas-wrap{background:linear-gradient(145deg,#050711,#101a35);box-shadow:0 25px 80px #0008;padding:12px;border:1px solid #2c3a62;border-top:0;border-radius:0 0 18px 18px}.canvas-wrap canvas{display:block;width:100%;height:auto;max-height:68vh;object-fit:contain;border-radius:10px;touch-action:none}.mobile-controls{display:flex;justify-content:space-between;gap:10px;margin-top:10px}.mobile-controls div{display:flex;gap:8px;flex-wrap:wrap}.mobile-controls button{min-width:58px;min-height:48px;border:1px solid #405180;background:#172341;color:white;border-radius:14px;font-weight:800;touch-action:none}@media(max-width:720px){.arcade-shell{padding:12px}.hero-orb{display:none}.game-grid{grid-template-columns:1fr}.game-card{grid-template-columns:54px 1fr}.game-card b{display:none}.game-icon{font-size:38px}.hud{flex-direction:column}.arcade-hero{padding:24px 4px}.game-head{margin-top:8px}}
`}</style>}
