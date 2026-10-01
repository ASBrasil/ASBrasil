import Link from "next/link";
import { db } from "@/lib/db";
import { GamesSubNav } from "@/components/admin/GamesSubNav";
import { UniverseGameManager } from "@/components/admin/UniverseGameManager";

export const dynamic = "force-dynamic";

/**
 * Personagens jogáveis + Loja (01/10) saíram daqui - viraram parte do
 * elenco de Personagens de cada Experiência (model Character, mesmo
 * elenco que já concedia recompensa de fase), editável em
 * Experiências → [a experiência] → Personagens. O antigo elenco
 * puramente visual (UniverseCharacterManager/UniverseCharacter) não é
 * mais usado pra escolher com quem jogar - ele nunca teve dono nem
 * desbloqueio, por isso os personagens criados lá nunca "entravam" no
 * jogo de verdade. Tabela mantida sem uso, sem migration destrutiva.
 */
export default async function UniverseArcadePage() {
  const [games, experiences] = await Promise.all([
    db.universeGame.findMany({
      include: { experience: { select: { name: true } } },
      orderBy: [{ experienceId: "asc" }, { order: "asc" }, { createdAt: "desc" }],
    }),
    db.experience.findMany({ select: { id: true, name: true, slug: true }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div>
      <div className="header">
        <span className="as-eyebrow">Universo AS</span>
        <h1 className="as-title">🕹️ Universo AS (arcade)</h1>
        <p className="as-subtitle">
          O hub de arcade bônus (hoje em <code>/eventos/[experiencia]/arcade</code>) é por
          experiência: cada jogo pertence a uma experiência específica (compartilhado por todos os
          sorteios dela), com capa e textos próprios. Um sorteio avulso, sem experiência vinculada,
          não tem Universo AS. Nasce em Rascunho - só vira visível pra participantes quando você
          mudar pra Teste ou Ao vivo.
        </p>
        <p className="as-subtitle characters-note">
          Os <strong>personagens jogáveis e a Loja</strong> (quem desbloqueia o quê, com quantas
          moedas) agora ficam na página de cada Experiência, junto com o resto dela - abra a
          experiência e vá na aba Personagens.
          {experiences.length > 0 && (
            <>
              {" "}Atalho:{" "}
              {experiences.map((ex, i) => (
                <span key={ex.id}>
                  <Link href={`/admin/experiencias/${ex.id}`}>{ex.name}</Link>
                  {i < experiences.length - 1 ? ", " : ""}
                </span>
              ))}
              .
            </>
          )}
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

      <style>{`
        .characters-note {
          margin-top: 0.6rem;
          padding-top: 0.6rem;
          border-top: 1px dashed var(--border, rgba(0, 0, 0, 0.12));
        }
        .header { margin-bottom: 1.75rem; max-width: 42rem; }
        .header .as-subtitle { line-height: 1.5; }
      `}</style>
    </div>
  );
}
