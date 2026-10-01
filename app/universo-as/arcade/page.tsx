import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { getSessionAdminId } from "@/lib/auth";
import { canViewArcadeGame } from "@/lib/arcade";
import { ParticipantTopNav } from "@/components/participant/ParticipantTopNav";

export const metadata = { title: "AS Game Universe" };
export const dynamic = "force-dynamic";

/**
 * Desde 01/10 o hub do Universo AS é por evento (/e/[slug]/arcade, ver
 * UniverseGame/UniverseCharacter em prisma/schema.prisma) - esse endereço
 * global virou só uma porta de entrada: manda direto pro evento certo
 * quando só tem um com jogo visível, ou mostra uma lista pra escolher.
 */
export default async function ArcadeEntryPage() {
  const [email, adminId, events] = await Promise.all([
    getParticipantEmail(),
    getSessionAdminId(),
    db.event.findMany({
      where: { active: true, archived: false, universeGames: { some: {} } },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: { universeGames: true },
    }),
  ]);

  const isAdmin = Boolean(adminId);
  const isTester = email ? Boolean(await db.gameTester.findUnique({ where: { email } })) : false;

  const eventsWithVisibleGames = events.filter((ev) =>
    ev.universeGames.some((g) => canViewArcadeGame(g.visibility, isAdmin, isTester))
  );

  if (eventsWithVisibleGames.length === 1) {
    redirect(`/e/${eventsWithVisibleGames[0].slug}/arcade`);
  }

  return (
    <main className="as-shell page">
      <ParticipantTopNav />
      <section className="as-container content">
        <div className="page-heading">
          <span className="as-eyebrow">AS Brasil • Game Universe</span>
          <h1 className="as-title">Escolha seu mundo</h1>
          <p className="as-subtitle">
            Cada evento tem seu próprio arcade, com jogos e personagens diferentes.
          </p>
        </div>

        {eventsWithVisibleGames.length === 0 ? (
          <p className="empty">Nenhum arcade disponível por aqui no momento. Volte em breve!</p>
        ) : (
          <div className="grid">
            {eventsWithVisibleGames.map((ev) => (
              <Link key={ev.id} href={`/e/${ev.slug}/arcade`} className="as-card as-card-hover card">
                <p className="name">{ev.name}</p>
                <span className="cta">Jogar →</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .content { padding: 3rem 0 6rem; }
        .page-heading { max-width: 34rem; margin-bottom: 2rem; }
        .empty { color: var(--as-muted); font-size: 0.9rem; }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
          gap: 1rem;
        }
        .card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          text-decoration: none;
          color: inherit;
        }
        .name { margin: 0; font-weight: 700; color: var(--as-text); }
        .cta { font-size: 0.8rem; font-weight: 700; color: var(--as-cyan); }
      `}</style>
    </main>
  );
}
