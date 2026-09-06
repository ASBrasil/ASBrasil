import { db } from "@/lib/db";
import { GameTesterManager } from "@/components/admin/GameTesterManager";
import { GamesSubNav } from "@/components/admin/GamesSubNav";

export const dynamic = "force-dynamic";

export default async function GameTestersPage() {
  const testers = await db.gameTester.findMany({ orderBy: { createdAt: "desc" } });

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

      <GameTesterManager
        testers={testers.map((t) => ({ email: t.email, createdAt: t.createdAt.toISOString() }))}
      />

      <style>{`
        .header { margin-bottom: 1rem; max-width: 42rem; }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; line-height: 1.5; }
      `}</style>
    </div>
  );
}
