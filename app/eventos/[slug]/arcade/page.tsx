import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getParticipantEmail } from "@/lib/participant-session";
import { getSessionAdminId } from "@/lib/auth";
import { canViewArcadeGame } from "@/lib/arcade";
import { ArcadeUniverse } from "@/components/arcade/ArcadeUniverse";

export const metadata = { title: "AS Game Universe" };
export const dynamic = "force-dynamic";

/**
 * Hub do Universo AS por EXPERIÊNCIA (ajustado em 01/10 - era por evento
 * individual, ver git history) - cada experiência tem seu próprio catálogo
 * de jogos/personagens (UniverseGame/UniverseCharacter), compartilhado por
 * todos os sorteios dela, gerenciado no admin em Jogos → 🕹️ Universo AS.
 * Mesma regra de visibilidade dos outros jogos: LIVE é aberto, DRAFT/
 * TESTING só pra admin/testador. Experiência inativa só é visível pro
 * admin (preview), mesma regra da landing /eventos/[slug].
 */
export default async function ExperienceArcadePage({ params }: { params: { slug: string } }) {
  const adminId = await getSessionAdminId();
  const experience = await db.experience.findUnique({ where: { slug: params.slug } });
  if (!experience) notFound();
  if (!experience.active && !adminId) notFound();

  const [email, games, characters] = await Promise.all([
    getParticipantEmail(),
    db.universeGame.findMany({ where: { experienceId: experience.id }, orderBy: { order: "asc" } }),
    db.universeCharacter.findMany({ where: { experienceId: experience.id }, orderBy: { order: "asc" } }),
  ]);

  const isAdmin = Boolean(adminId);
  const isTester = email ? Boolean(await db.gameTester.findUnique({ where: { email } })) : false;

  const visibleGames = games
    .filter((g) => canViewArcadeGame(g.visibility, isAdmin, isTester))
    .map((g) => ({
      id: g.id,
      engine: g.engine as "WORLD" | "MAZE" | "BLAST" | "CITYRUN",
      title: g.title,
      description: g.description,
      tag: g.tag,
      coverImageUrl: g.coverImageUrl,
    }));

  return (
    <ArcadeUniverse
      games={visibleGames}
      characters={characters.map((c) => ({ id: c.id, name: c.name, imageUrl: c.imageUrl }))}
    />
  );
}
