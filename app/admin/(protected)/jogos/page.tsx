import { db } from "@/lib/db";
import Link from "next/link";
import { GameManager } from "@/components/admin/GameManager";
import { GamesSubNav } from "@/components/admin/GamesSubNav";

export const dynamic = "force-dynamic";

export default async function JogosPage() {
  const [games, events] = await Promise.all([
    db.game.findMany({
      include: { event: { select: { name: true, slug: true } }, phases: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.event.findMany({ select: { id: true, name: true }, orderBy: { startAt: "desc" } }),
  ]);

  return (
    <div>
      <div className="header">
        <h1>🎮 Universo AS — Jogos</h1>
        <p className="subtitle">
          Cada jogo nasce em <strong>Rascunho</strong> (só o admin vê) e só fica visível pra
          participantes de verdade quando você mudar pra Teste (com testadores) ou Ao vivo.
          Qualquer pessoa do Universo AS pode jogar, mas só quem está inscrito no evento do jogo
          pode receber o brinde configurado numa fase.
        </p>
      </div>

      <GamesSubNav active="jogos" />

      <GameManager
        games={games.map((g) => ({
          id: g.id,
          slug: g.slug,
          name: g.name,
          type: g.type,
          visibility: g.visibility,
          eventName: g.event.name,
          phaseCount: g.phases.length,
        }))}
        events={events}
      />

      <style>{`
        .header { margin-bottom: 1rem; max-width: 42rem; }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; line-height: 1.5; }
      `}</style>
    </div>
  );
}
