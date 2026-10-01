import { db } from "@/lib/db";
import { GamesSubNav } from "@/components/admin/GamesSubNav";
import { UniverseGameManager } from "@/components/admin/UniverseGameManager";
import { UniverseCharacterManager } from "@/components/admin/UniverseCharacterManager";

export const dynamic = "force-dynamic";

export default async function UniverseArcadePage() {
  const [games, characters, experiences] = await Promise.all([
    db.universeGame.findMany({
      include: { experience: { select: { name: true } } },
      orderBy: [{ experienceId: "asc" }, { order: "asc" }, { createdAt: "desc" }],
    }),
    db.universeCharacter.findMany({
      include: { experience: { select: { name: true } } },
      orderBy: [{ experienceId: "asc" }, { order: "asc" }, { createdAt: "desc" }],
    }),
    db.experience.findMany({ select: { id: true, name: true }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div>
      <div className="header">
        <span className="as-eyebrow">Universo AS</span>
        <h1 className="as-title">🕹️ Universo AS (arcade)</h1>
        <p className="as-subtitle">
          O hub de arcade bônus (hoje em <code>/eventos/[experiencia]/arcade</code>) é por
          experiência: cada jogo e cada personagem-avatar pertence a uma experiência específica
          (compartilhado por todos os sorteios dela), com capa e textos próprios. Um sorteio avulso,
          sem experiência vinculada, não tem Universo AS. Nasce em Rascunho - só vira visível pra
          participantes quando você mudar pra Teste ou Ao vivo.
        </p>
      </div>

      <GamesSubNav active="arcade" />

      <UniverseGameManager
        games={games.map((g) => ({
          id: g.id,
          experienceId: g.experienceId,
          experienceName: g.experience.name,
          engine: g.engine as any,
          slug: g.slug,
          title: g.title,
          description: g.description,
          tag: g.tag,
          coverImageUrl: g.coverImageUrl,
          order: g.order,
          visibility: g.visibility,
        }))}
        experiences={experiences}
      />

      <UniverseCharacterManager
        characters={characters.map((c) => ({
          id: c.id,
          experienceId: c.experienceId,
          experienceName: c.experience.name,
          name: c.name,
          imageUrl: c.imageUrl,
          order: c.order,
        }))}
        experiences={experiences}
      />

      <style>{`
        .header { margin-bottom: 1.75rem; max-width: 42rem; }
        .header .as-subtitle { line-height: 1.5; }
      `}</style>
    </div>
  );
}
