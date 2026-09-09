import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GamePhaseManager } from "@/components/admin/GamePhaseManager";
import { GameThemeEditor } from "@/components/admin/GameThemeEditor";
import { GameSettingsManager } from "@/components/admin/GameSettingsManager";

export const dynamic = "force-dynamic";

export default async function GameDetailPage({ params }: { params: { id: string } }) {
  const game = await db.game.findUnique({
    where: { id: params.id },
    include: {
      event: { select: { name: true, slug: true } },
      phases: { orderBy: { order: "asc" } },
    },
  });
  if (!game) notFound();

  const cards = await db.gameCard.findMany({
    select: { id: true, name: true, rarity: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <Link href="/admin/jogos" className="back">
        ← Voltar pros jogos
      </Link>

      <div className="header">
        <h1>{game.name}</h1>
        <p className="subtitle">
          Evento: <strong>{game.event.name}</strong> · slug: <code>{game.slug}</code>
        </p>
      </div>

      <GameSettingsManager gameId={game.id} name={game.name} slug={game.slug} />

      <GameThemeEditor gameId={game.id} theme={game.theme as any} />

      <GamePhaseManager
        gameId={game.id}
        visibility={game.visibility}
        phases={game.phases.map((p: any) => ({
          id: p.id,
          order: p.order,
          title: p.title,
          content: p.content,
          points: p.points,
          rewardCardId: p.rewardCardId,
          grantsExtraTicket: p.grantsExtraTicket,
        }))}
        cards={cards}
      />

      <style>{`
        .back {
          color: var(--indigo-600);
          text-decoration: none;
          font-size: 0.85rem;
        }
        .header { margin: 1rem 0 1.5rem; max-width: 42rem; }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; }
        code {
          background: var(--bg);
          padding: 0.1rem 0.4rem;
          border-radius: 0.3rem;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}