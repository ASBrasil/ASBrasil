import { db } from "@/lib/db";
import { GameCardManager } from "@/components/admin/GameCardManager";
import { GamesSubNav } from "@/components/admin/GamesSubNav";

export const dynamic = "force-dynamic";

export default async function GameCardsPage() {
  const cards = await db.gameCard.findMany({ orderBy: { createdAt: "desc" } });

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
        cards={cards.map((c) => ({
          id: c.id,
          name: c.name,
          rarity: c.rarity,
          imageUrl: c.imageUrl,
          description: c.description,
        }))}
      />

      <style>{`
        .header { margin-bottom: 1rem; max-width: 42rem; }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; line-height: 1.5; }
      `}</style>
    </div>
  );
}
