import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getParticipantEmail } from "@/lib/participant-session";
import { getSessionAdminId } from "@/lib/auth";
import { canViewArcadeGame } from "@/lib/arcade";
import { ensureStarterCharacters } from "@/lib/characters";
import { getCoinBalance } from "@/lib/coins";
import { ArcadeUniverse } from "@/components/arcade/ArcadeUniverse";

export const metadata = { title: "AS Game Universe" };
export const dynamic = "force-dynamic";

/**
 * Hub do Universo AS por EXPERIÊNCIA (ajustado em 01/10 - era por evento
 * individual, ver git history) - cada experiência tem seu próprio catálogo
 * de jogos (UniverseGame), compartilhado por todos os sorteios dela,
 * gerenciado no admin em Jogos → 🕹️ Universo AS. Mesma regra de
 * visibilidade dos outros jogos: LIVE é aberto, DRAFT/TESTING só pra
 * admin/testador. Experiência inativa só é visível pro admin (preview),
 * mesma regra da landing /eventos/[slug].
 *
 * Personagens jogáveis (01/10): passaram a usar o elenco de Personagens da
 * Experiência (model Character/PlayerCharacter, editável em Experiências →
 * [a experiência] → Personagens), não mais o UniverseCharacter (esse nunca
 * teve dono nem desbloqueio - era puramente visual, por isso não
 * funcionava em jogo de verdade). Quem tem e-mail identificado já ganha de
 * graça o(s) personagem(ns) `isStarter` dessa Experiência ao abrir a
 * página (ensureStarterCharacters); o resto do elenco aparece bloqueado na
 * Loja dentro do ArcadeUniverse, pra desbloquear com moeda (CoinEntry).
 * Visitante sem e-mail só joga com o(s) inicial(is), sem Loja (mesmo
 * padrão "funciona sem logar, só não persiste" dos outros progressos do
 * arcade).
 */
export default async function ExperienceArcadePage({ params }: { params: { slug: string } }) {
  const adminId = await getSessionAdminId();
  const experience = await db.experience.findUnique({ where: { slug: params.slug } });
  if (!experience) notFound();
  if (!experience.active && !adminId) notFound();

  const email = await getParticipantEmail();
  if (email) await ensureStarterCharacters(email, experience.id);

  const [games, roster, ownedRows, coinBalance] = await Promise.all([
    db.universeGame.findMany({ where: { experienceId: experience.id }, orderBy: { order: "asc" } }),
    db.character.findMany({
      where: { experienceId: experience.id },
      orderBy: [{ pointsCost: "asc" }, { createdAt: "asc" }],
    }),
    email
      ? db.playerCharacter.findMany({
          where: { email, character: { experienceId: experience.id } },
          select: { characterId: true },
        })
      : Promise.resolve([]),
    email ? getCoinBalance(email) : Promise.resolve(0),
  ]);

  const ownedIds = new Set(ownedRows.map((r) => r.characterId));
  const characters = roster.map((c) => ({
    id: c.id,
    name: c.name,
    imageUrl: c.imageUrl,
    rarity: c.rarity,
    spriteId: c.spriteId,
    pointsCost: c.pointsCost,
    owned: email ? ownedIds.has(c.id) : c.isStarter,
  }));

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
    <ArcadeUniverse games={visibleGames} characters={characters} coinBalance={coinBalance} canBuy={Boolean(email)} />
  );
}
