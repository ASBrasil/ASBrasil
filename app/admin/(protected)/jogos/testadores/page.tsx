import { db } from "@/lib/db";
import { GameTesterManager } from "@/components/admin/GameTesterManager";
import { ArcadeGamesManager } from "@/components/admin/ArcadeGamesManager";
import { GamesSubNav } from "@/components/admin/GamesSubNav";
import { ARCADE_GAME_IDS, ARCADE_GAME_NAMES } from "@/lib/arcade";

export const dynamic = "force-dynamic";

export default async function GameTestersPage() {
  const [testers, arcadeSettings] = await Promise.all([
    db.gameTester.findMany({ orderBy: { createdAt: "desc" } }),
    db.arcadeGameSetting.findMany(),
  ]);

  const arcadeById = new Map(arcadeSettings.map((s) => [s.gameId, s.visibility]));
  const arcadeGames = ARCADE_GAME_IDS.map((id) => ({
    gameId: id,
    name: ARCADE_GAME_NAMES[id],
    visibility: arcadeById.get(id) ?? "LIVE",
  }));

  return (
    <div>
      <div className="header">
        <h1>🧪 Testadores — Universo AS</h1>
        <p className="subtitle">
          Enquanto um jogo está em <strong>Teste</strong>, só os e-mails desta lista conseguem ver
          e jogar ele como participante - todo mundo mais continua sem ver nada, como se a aba não
          existisse. Como admin, você sempre consegue abrir qualquer jogo, mesmo sem estar aqui.
        </p>
      </div>

      <GamesSubNav active="testadores" />

      <h2 className="section-title">Jogos do hub Arcade (/universo-as/arcade)</h2>
      <ArcadeGamesManager games={arcadeGames} />

      <h2 className="section-title">Testadores</h2>
      <GameTesterManager
        testers={testers.map((t) => ({ email: t.email, createdAt: t.createdAt.toISOString() }))}
      />

      <style>{`
        .section-title { font-size: 1rem; margin: 1.5rem 0 0.6rem; font-family: var(--font-display, inherit); }
        .header { margin-bottom: 1rem; max-width: 42rem; }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; line-height: 1.5; }
      `}</style>
    </div>
  );
}
