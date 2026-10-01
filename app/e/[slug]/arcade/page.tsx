import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getParticipantEmail } from "@/lib/participant-session";
import { getSessionAdminId } from "@/lib/auth";
import { canViewArcadeGame } from "@/lib/arcade";
import { ArcadeUniverse } from "@/components/arcade/ArcadeUniverse";

export const metadata = { title: "AS Game Universe" };
export const dynamic = "force-dynamic";

/**
 * Hub do Universo AS por evento (01/10) - cada sorteio tem seu próprio
 * catálogo de jogos/personagens (UniverseGame/UniverseCharacter), gerenciado
 * no admin em Jogos → 🕹️ Universo AS. Mesma regra de visibilidade dos
 * outros jogos: LIVE é aberto, DRAFT/TESTING só pra admin/testador.
 */
export default async function EventArcadePage({ params }: { params: { slug: string } }) {
  const event = await db.event.findUnique({ where: { slug: params.slug } });
  if (!event || !event.active) notFound();

  const [email, adminId, games, characters] = await Promise.all([
    getParticipantEmail(),
    getSessionAdminId(),
    db.universeGame.findMany({ where: { eventId: event.id }, orderBy: { order: "asc" } }),
    db.universeCharacter.findMany({ where: { eventId: event.id }, orderBy: { order: "asc" } }),
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
