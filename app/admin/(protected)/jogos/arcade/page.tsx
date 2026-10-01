import { db } from "@/lib/db";
import { GamesSubNav } from "@/components/admin/GamesSubNav";
import { UniverseGameManager } from "@/components/admin/UniverseGameManager";
import { UniverseCharacterManager } from "@/components/admin/UniverseCharacterManager";

export const dynamic = "force-dynamic";

export default async function UniverseArcadePage() {
  const [games, characters, events] = await Promise.all([
    db.universeGame.findMany({
      include: { event: { select: { name: true } } },
      orderBy: [{ eventId: "asc" }, { order: "asc" }, { createdAt: "desc" }],
    }),
    db.universeCharacter.findMany({
      include: { event: { select: { name: true } } },
      orderBy: [{ eventId: "asc" }, { order: "asc" }, { createdAt: "desc" }],
    }),
    db.event.findMany({ select: { id: true, name: true }, orderBy: { startAt: "desc" } }),
  ]);

  return (
    <div>
      <div className="header">
        <span className="as-eyebrow">Universo AS</span>
        <h1 className="as-title">🕹️ Universo AS (arcade)</h1>
        <p className="as-subtitle">
          O hub de arcade bônus (hoje em <code>/e/[evento]/arcade</code>) agora é por evento: cada
          jogo e cada personagem-avatar pertence a um evento específico, com capa e textos próprios.
          Nasce em Rascunho - só vira visível pra participantes quando você mudar pra Teste ou Ao
          vivo.
        </p>
      </div>

      <GamesSubNav active="arcade" />

      <UniverseGameManager
        games={games.map((g) => ({
          id: g.id,
          eventId: g.eventId,
          eventName: g.event.name,
          engine: g.engine as any,
          slug: g.slug,
          title: g.title,
          description: g.description,
          tag: g.tag,
          coverImageUrl: g.coverImageUrl,
          order: g.order,
          visibility: g.visibility,
        }))}
        events={events}
      />

      <UniverseCharacterManager
        characters={characters.map((c) => ({
          id: c.id,
          eventId: c.eventId,
          eventName: c.event.name,
          name: c.name,
          imageUrl: c.imageUrl,
          order: c.order,
        }))}
        events={events}
      />

      <style>{`
        .header { margin-bottom: 1.75rem; max-width: 42rem; }
        .header .as-subtitle { line-height: 1.5; }
      `}</style>
    </div>
  );
}
