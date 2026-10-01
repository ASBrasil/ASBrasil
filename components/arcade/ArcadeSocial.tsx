"use client";

// AS Social - camada de amigos/convites/salas do hub /universo-as/arcade,
// combinada com o Paulo pra fechar o arcade depois dos 4 jogos (ver
// claude/pendencias-sorteios.md). Sem infraestrutura de tempo real: o
// "modo sala" é assíncrono, cada jogador joga a própria partida normal de
// um dos 4 jogos (mesmos componentes/rotas que já existem) e a sala só
// compara quem tem a melhor pontuação naquele jogo, atualizando por
// polling a cada 2,5s (ver GET .../rooms/[code]/route.ts).

import { useEffect, useRef, useState } from "react";
import { WorldAdventure } from "./WorldAdventure";
import { CityRun } from "./CityRun";
import { NeonMaze } from "./NeonMaze";
import { BlastArena } from "./BlastArena";

type Character = { id: string; name: string; src: string };
type ArcadeGameId = "world" | "maze" | "blast" | "run";

const GAME_LABELS: Record<ArcadeGameId, { name: string; icon: string }> = {
  world: { name: "AS World Adventure", icon: "🏰" },
  maze: { name: "AS Neon Maze", icon: "🌀" },
  blast: { name: "AS Blast Arena", icon: "💥" },
  run: { name: "AS City Run", icon: "⚡" },
};

type Friend = { id: string; email: string; label: string; avatarUrl: string | null };
type Invite = { id: string; fromLabel: string; roomCode: string; gameId: ArcadeGameId; gameName: string };
type RoomSummary = { code: string; gameId: ArcadeGameId; gameName: string; status: "WAITING" | "PLAYING" | "FINISHED"; isHost: boolean; playerCount: number };
type RoomPlayer = { email: string; label: string; avatarUrl: string | null; ready: boolean; isHost: boolean; score: number };
type RoomDetail = { code: string; gameId: ArcadeGameId; gameName: string; status: "WAITING" | "PLAYING" | "FINISHED"; hostEmail: string; isHost: boolean; players: RoomPlayer[] };

type Tab = "convites" | "amigos" | "salas";

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`/api/public/arcade-social${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Algo deu errado");
  return data;
}

export function ArcadeSocial({ character }: { character: Character }) {
  const [tab, setTab] = useState<Tab>("convites");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<Friend[]>([]);
  const [outgoing, setOutgoing] = useState<Friend[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [addEmail, setAddEmail] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openRoom, setOpenRoom] = useState<string | null>(null);

  function loadAll() {
    api("/friends").then((d) => { setFriends(d.friends); setIncoming(d.incoming); setOutgoing(d.outgoing); }).catch(() => {});
    api("/invites").then((d) => setInvites(d.invites)).catch(() => {});
    api("/rooms").then((d) => setRooms(d.rooms)).catch(() => {});
  }
  useEffect(loadAll, []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await action(); loadAll(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  if (openRoom) {
    return <RoomView code={openRoom} character={character} onBack={() => { setOpenRoom(null); loadAll(); }} />;
  }

  return (
    <div className="social">
      <div className="social-tabs">
        <button className={tab === "convites" ? "active" : ""} onClick={() => setTab("convites")}>
          Convites {invites.length > 0 && <span className="badge">{invites.length}</span>}
        </button>
        <button className={tab === "amigos" ? "active" : ""} onClick={() => setTab("amigos")}>
          Amigos {incoming.length > 0 && <span className="badge">{incoming.length}</span>}
        </button>
        <button className={tab === "salas" ? "active" : ""} onClick={() => setTab("salas")}>Salas</button>
      </div>

      {error && <p className="social-error">{error}</p>}

      {tab === "convites" && (
        <div className="social-panel">
          {invites.length === 0 && <p className="social-hint">Nenhum convite pendente por enquanto.</p>}
          {invites.map((inv) => (
            <div key={inv.id} className="social-row">
              <div>
                <strong>{inv.fromLabel}</strong> te chamou pra jogar {GAME_LABELS[inv.gameId].icon} {inv.gameName}
              </div>
              <div className="social-actions">
                <button disabled={busy} onClick={() => run(() => api(`/invites/${inv.id}`, { method: "PATCH", body: JSON.stringify({ action: "accept" }) }).then(() => setOpenRoom(inv.roomCode)))}>Entrar</button>
                <button className="ghost" disabled={busy} onClick={() => run(() => api(`/invites/${inv.id}`, { method: "PATCH", body: JSON.stringify({ action: "decline" }) }))}>Recusar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "amigos" && (
        <div className="social-panel">
          <div className="social-add">
            <input
              placeholder="E-mail do seu amigo na AS Brasil"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
            />
            <button disabled={busy || !addEmail} onClick={() => run(() => api("/friends", { method: "POST", body: JSON.stringify({ email: addEmail }) }).then(() => setAddEmail("")))}>Adicionar</button>
          </div>

          {incoming.length > 0 && (
            <>
              <h4>Pedidos recebidos</h4>
              {incoming.map((f) => (
                <div key={f.id} className="social-row">
                  <FriendCard f={f} />
                  <div className="social-actions">
                    <button disabled={busy} onClick={() => run(() => api(`/friends/${f.id}`, { method: "PATCH", body: JSON.stringify({ action: "accept" }) }))}>Aceitar</button>
                    <button className="ghost" disabled={busy} onClick={() => run(() => api(`/friends/${f.id}`, { method: "DELETE" }))}>Recusar</button>
                  </div>
                </div>
              ))}
            </>
          )}

          {outgoing.length > 0 && (
            <>
              <h4>Pedidos enviados</h4>
              {outgoing.map((f) => (
                <div key={f.id} className="social-row">
                  <FriendCard f={f} />
                  <div className="social-actions">
                    <button className="ghost" disabled={busy} onClick={() => run(() => api(`/friends/${f.id}`, { method: "DELETE" }))}>Cancelar</button>
                  </div>
                </div>
              ))}
            </>
          )}

          <h4>Seus amigos</h4>
          {friends.length === 0 && <p className="social-hint">Ninguém ainda - adicione um amigo pelo e-mail acima.</p>}
          {friends.map((f) => (
            <div key={f.id} className="social-row">
              <FriendCard f={f} />
              <div className="social-actions">
                <button className="ghost" disabled={busy} onClick={() => run(() => api(`/friends/${f.id}`, { method: "DELETE" }))}>Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "salas" && (
        <div className="social-panel">
          <div className="social-create-games">
            {(Object.keys(GAME_LABELS) as ArcadeGameId[]).map((id) => (
              <button
                key={id}
                className="social-game-btn"
                disabled={busy}
                onClick={() => run(() => api("/rooms", { method: "POST", body: JSON.stringify({ gameId: id }) }).then((d) => setOpenRoom(d.code)))}
              >
                <span>{GAME_LABELS[id].icon}</span>
                Criar sala de {GAME_LABELS[id].name}
              </button>
            ))}
          </div>

          <div className="social-join">
            <input placeholder="Código da sala (ex: AB3F7K)" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={6} />
            <button disabled={busy || joinCode.length < 4} onClick={() => run(() => api(`/rooms/${joinCode}/join`, { method: "POST" }).then(() => setOpenRoom(joinCode)))}>Entrar com código</button>
          </div>

          <h4>Suas salas</h4>
          {rooms.length === 0 && <p className="social-hint">Nenhuma sala ainda - crie uma acima ou entre com um código.</p>}
          {rooms.map((r) => (
            <button key={r.code} className="social-room-row" onClick={() => setOpenRoom(r.code)}>
              <span>{GAME_LABELS[r.gameId].icon} {r.gameName}</span>
              <span className={`social-status social-status-${r.status.toLowerCase()}`}>
                {r.status === "WAITING" ? "Esperando" : r.status === "PLAYING" ? "Em andamento" : "Encerrada"}
              </span>
              <span className="social-room-code">{r.code}</span>
              <span>{r.playerCount} {r.playerCount === 1 ? "jogador" : "jogadores"}</span>
            </button>
          ))}
        </div>
      )}

      <SocialStyles />
    </div>
  );
}

function FriendCard({ f }: { f: Friend }) {
  return (
    <div className="social-friend">
      {f.avatarUrl ? <img src={f.avatarUrl} alt="" /> : <span className="social-avatar-fallback">{f.label[0]?.toUpperCase()}</span>}
      <div>
        <strong>{f.label}</strong>
        <span>{f.email}</span>
      </div>
    </div>
  );
}

function RoomView({ code, character, onBack }: { code: string; character: Character; onBack: () => void }) {
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function poll() {
    api(`/rooms/${code}`).then(setRoom).catch((e) => setError((e as Error).message));
  }
  useEffect(() => {
    poll();
    api("/friends").then((d) => setFriends(d.friends)).catch(() => {});
    timer.current = setInterval(poll, 2500);
    return () => { if (timer.current) clearInterval(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function act(path: string, init?: RequestInit) {
    try { await api(path, init); poll(); } catch (e) { setError((e as Error).message); }
  }

  if (playing && room) {
    const finish = (score: number) => { setPlaying(false); poll(); };
    if (room.gameId === "world") return <WorldAdventure character={character} onFinish={finish} />;
    if (room.gameId === "maze") return <NeonMaze character={character} onFinish={finish} />;
    if (room.gameId === "blast") return <BlastArena character={character} onFinish={finish} />;
    return <CityRun character={character} onFinish={finish} />;
  }

  if (!room) {
    return <div className="social"><p className="social-hint">Carregando sala…</p>{error && <p className="social-error">{error}</p>}<SocialStyles /></div>;
  }

  return (
    <div className="social">
      <div className="social-room-head">
        <button className="ghost" onClick={onBack}>← Voltar</button>
        <div>
          <strong>{GAME_LABELS[room.gameId].icon} {room.gameName}</strong>
          <span className={`social-status social-status-${room.status.toLowerCase()}`}>
            {room.status === "WAITING" ? "Esperando" : room.status === "PLAYING" ? "Em andamento" : "Encerrada"}
          </span>
        </div>
        <div className="social-room-code-big">{room.code}</div>
      </div>

      {error && <p className="social-error">{error}</p>}

      {room.status !== "FINISHED" && room.isHost && (
        <div className="social-invite-row">
          <select value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}>
            <option value="">Convidar um amigo…</option>
            {friends.map((f) => <option key={f.id} value={f.email}>{f.label}</option>)}
          </select>
          <button disabled={!inviteEmail} onClick={() => act("/invites", { method: "POST", body: JSON.stringify({ roomId: room.code, toEmail: inviteEmail }) }).then(() => setInviteEmail(""))}>Convidar</button>
        </div>
      )}

      <div className="social-scoreboard">
        {room.players.map((p, i) => (
          <div key={p.email} className="social-score-row">
            <span className="social-score-rank">{i + 1}º</span>
            {p.avatarUrl ? <img src={p.avatarUrl} alt="" /> : <span className="social-avatar-fallback">{p.label[0]?.toUpperCase()}</span>}
            <span className="social-score-name">{p.label}{p.isHost && " 👑"}</span>
            {room.status === "WAITING" && <span className={`social-ready ${p.ready ? "yes" : ""}`}>{p.ready ? "Pronto" : "Esperando"}</span>}
            <span className="social-score-value">{p.score} XP</span>
          </div>
        ))}
      </div>

      {room.status === "WAITING" && (
        <div className="social-room-actions">
          <button onClick={() => act(`/rooms/${code}/ready`, { method: "POST", body: JSON.stringify({ ready: true }) })}>Estou pronto</button>
          <button className="ghost" onClick={() => act(`/rooms/${code}/ready`, { method: "POST", body: JSON.stringify({ ready: false }) })}>Ainda não</button>
          {room.isHost && <button onClick={() => act(`/rooms/${code}/start`, { method: "POST" })}>Iniciar sala</button>}
        </div>
      )}

      {room.status === "PLAYING" && (
        <div className="social-room-actions">
          <button onClick={() => setPlaying(true)}>Jogar agora</button>
          {room.isHost && <button className="ghost" onClick={() => act(`/rooms/${code}/end`, { method: "POST" })}>Encerrar sala</button>}
        </div>
      )}

      {room.status !== "FINISHED" && (
        <button className="social-leave" onClick={() => act(`/rooms/${code}/leave`, { method: "POST" }).then(onBack)}>Sair da sala</button>
      )}

      <SocialStyles />
    </div>
  );
}

function SocialStyles() {
  return (
    <style jsx global>{`
      .social{max-width:720px;margin:0 auto;color:#fff}
      .social-tabs{display:flex;gap:8px;margin-bottom:16px}
      .social-tabs button{flex:1;background:#141e39;border:1px solid #2c3a62;color:#9eabd0;border-radius:14px;padding:10px;font-weight:700;position:relative}
      .social-tabs button.active{background:#1d2c56;color:#fff;border-color:#5568ff}
      .badge{position:absolute;top:-6px;right:-6px;background:#ff4fa3;color:#fff;font-size:10px;border-radius:999px;padding:2px 6px;font-weight:900}
      .social-error{color:#ff8a8a;background:#3a1220;border:1px solid #5a2436;border-radius:12px;padding:8px 12px;margin-bottom:12px;font-size:13px}
      .social-hint{color:#9faed1;font-size:14px}
      .social-panel h4{margin:18px 0 8px;color:#dfe6ff;font-size:13px;text-transform:uppercase;letter-spacing:.05em}
      .social-add,.social-join,.social-invite-row{display:flex;gap:8px;margin-bottom:10px}
      .social-add input,.social-join input,.social-invite-row select{flex:1;background:#0e1530;border:1px solid #2c3a62;border-radius:12px;padding:10px 12px;color:#fff}
      .social-add button,.social-join button,.social-invite-row button{background:#4f5fff;border:0;color:#fff;border-radius:12px;padding:10px 16px;font-weight:700;white-space:nowrap}
      .social-row{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#141e39;border:1px solid #2c3a62;border-radius:14px;padding:10px 14px;margin-bottom:8px}
      .social-friend{display:flex;align-items:center;gap:10px}
      .social-friend img,.social-avatar-fallback{width:36px;height:36px;border-radius:50%;object-fit:cover;background:#28365e;display:flex;align-items:center;justify-content:center;font-weight:800}
      .social-friend div{display:flex;flex-direction:column}
      .social-friend span{font-size:11px;color:#9faed1}
      .social-actions{display:flex;gap:6px}
      .social-actions button{background:#4f5fff;border:0;color:#fff;border-radius:10px;padding:7px 12px;font-size:12px;font-weight:700}
      .social-actions button.ghost,button.ghost{background:transparent;border:1px solid #405180;color:#cdd6f5}
      .social-create-games{display:grid;gap:8px;margin-bottom:16px}
      .social-game-btn{display:flex;align-items:center;gap:10px;background:#141e39;border:1px solid #2c3a62;color:#fff;border-radius:14px;padding:12px 16px;font-weight:700;text-align:left}
      .social-game-btn span{font-size:20px}
      .social-room-row{display:flex;align-items:center;gap:10px;width:100%;background:#141e39;border:1px solid #2c3a62;border-radius:14px;padding:12px 16px;margin-bottom:8px;color:#fff;text-align:left}
      .social-room-code{font-family:monospace;letter-spacing:.1em;color:#7ce7ff;margin-left:auto}
      .social-status{font-size:11px;padding:3px 8px;border-radius:999px;background:#28365e}
      .social-status-waiting{background:#5a4a12;color:#ffd23f}
      .social-status-playing{background:#144a2e;color:#5cffb0}
      .social-status-finished{background:#2c3a62;color:#9eabd0}
      .social-room-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}
      .social-room-head>div{flex:1;display:flex;flex-direction:column;gap:4px}
      .social-room-code-big{font-family:monospace;letter-spacing:.15em;font-size:20px;color:#7ce7ff;background:#0e1530;border:1px solid #2c3a62;border-radius:12px;padding:8px 14px}
      .social-scoreboard{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
      .social-score-row{display:flex;align-items:center;gap:10px;background:#141e39;border:1px solid #2c3a62;border-radius:14px;padding:8px 12px}
      .social-score-rank{font-weight:900;color:#ffd23f;width:26px}
      .social-score-row img,.social-score-row .social-avatar-fallback{width:32px;height:32px;border-radius:50%;object-fit:cover;background:#28365e;display:flex;align-items:center;justify-content:center;font-weight:800}
      .social-score-name{flex:1;font-weight:700}
      .social-ready{font-size:11px;padding:3px 8px;border-radius:999px;background:#28365e;color:#9eabd0}
      .social-ready.yes{background:#144a2e;color:#5cffb0}
      .social-score-value{font-weight:900;color:#7ce7ff}
      .social-room-actions{display:flex;gap:10px;margin-bottom:14px}
      .social-room-actions button{flex:1;background:#4f5fff;border:0;color:#fff;border-radius:14px;padding:12px;font-weight:800}
      .social-room-actions button.ghost{background:transparent;border:1px solid #405180;color:#cdd6f5}
      .social-leave{width:100%;background:transparent;border:1px solid #5a2436;color:#ff8a8a;border-radius:14px;padding:10px;font-weight:700}
      @media(max-width:640px){
        .social-create-games{grid-template-columns:1fr}
        .social-room-row{flex-wrap:wrap}
        .social-room-code{margin-left:0}
      }
    `}</style>
  );
}
