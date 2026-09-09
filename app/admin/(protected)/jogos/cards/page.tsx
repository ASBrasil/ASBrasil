import { db } from "@/lib/db";
import { GameCardManager } from "@/components/admin/GameCardManager";
import { GamesSubNav } from "@/components/admin/GamesSubNav";

export const dynamic = "force-dynamic";

export default async function GameCardsPage() {
  const [cards, events, games] = await Promise.all([
    db.gameCard.findMany({ orderBy: { createdAt: "desc" } }),
    db.event.findMany({
      where: { archived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.game.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, event: { select: { name: true } } },
    }),
  ]);

  return (
    <div>
      <div className="header">
        <h1>🎴 Álbum de figurinhas — Universo AS</h1>
        <p className="subtitle">
          Catálogo único e compartilhado entre todos os jogos e eventos - cresce a cada jogo
          lançado, e o jogador mantém a coleção pra sempre no perfil do Universo AS.
        </p>
      </div>

      <GamesSubNav active="cards" />

      <GameCardManager
        cards={cards.map((c: (typeof cards)[number]) => ({
          id: c.id,
          name: c.name,
          rarity: c.rarity,
          imageUrl: c.imageUrl,
          description: c.description,
          unlockEventId: c.unlockEventId,
          unlockGameId: c.unlockGameId,
        }))}
        events={events}
        games={games.map((g: (typeof games)[number]) => ({ id: g.id, name: `${g.name} (${g.event.name})` }))}
      />

      <style>{`
        .header { margin-bottom: 1rem; max-width: 42rem; }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; line-height: 1.5; }
      `}</style>
    </div>
  );
}