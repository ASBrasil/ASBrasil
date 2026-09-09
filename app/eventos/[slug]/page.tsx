import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { getSessionAdminId } from "@/lib/auth";
import { getExperienceRanking } from "@/lib/ranking";
import { ParticipantTopNav } from "@/components/participant/ParticipantTopNav";
import { RankingList } from "@/components/participant/RankingList";

export const dynamic = "force-dynamic";

export default async function ExperienceLandingPage({ params }: { params: { slug: string } }) {
  const email = await getParticipantEmail();
  const adminId = await getSessionAdminId();
  if (!email && !adminId) redirect("/entrar");

  const experience = await db.experience.findUnique({
    where: { slug: params.slug },
    include: {
      events: {
        where: { archived: false },
        orderBy: { order: "asc" },
        include: { prizes: { select: { status: true } } },
      },
    },
  });
  if (!experience) notFound();
  // Experiência ainda não publicada: só admin pode ver, como preview.
  if (!experience.active && !adminId) notFound();

  const isTester = email ? await db.gameTester.findUnique({ where: { email } }) : null;
  // LIVE é público; TESTING e DRAFT só pra testadores/admin - participante
  // comum nunca vê rascunho, mesmo dentro da experiência dele.
  const visibilities: string[] = ["LIVE"];
  if (adminId || isTester) {
    visibilities.push("TESTING", "DRAFT");
  }

  const [games, ranking] = await Promise.all([
    db.game.findMany({
      where: { visibility: { in: visibilities as any }, event: { experienceId: experience.id } },
      include: { phases: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getExperienceRanking(experience.id),
  ]);

  const theme = experience.theme as {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundImageUrl?: string | null;
  } | null;
  const primary = theme?.primaryColor || "#3B55E6";
  const secondary = theme?.secondaryColor || "#0c2a5b";
  const bannerUrl = theme?.backgroundImageUrl;

  return (
    <main className="page">
      <ParticipantTopNav />

      <div
        className="hero"
        style={{
          background: bannerUrl
            ? `linear-gradient(0deg, rgba(0,0,0,.6), rgba(0,0,0,.1)), url(${bannerUrl}) center/cover`
            : `linear-gradient(135deg, ${primary}, ${secondary})`,
        }}
      >
        <div className="hero-inner">
          <Link href="/meus-eventos" className="back-link">
            ← Eventos
          </Link>
          <span className="badge">Experiência</span>
          <h1>{experience.name}</h1>
          {experience.subtitle && <p className="subtitle">{experience.subtitle}</p>}
        </div>
      </div>

      <section className="content">
        {experience.description && <p className="description">{experience.description}</p>}

        <h2>Sorteios desta experiência</h2>
        {experience.events.length === 0 ? (
          <p className="empty">Nenhum sorteio vinculado ainda - volte em breve.</p>
        ) : (
          <div className="events-grid">
            {experience.events.map((event) => {
              const eventTheme = event.theme as any;
              const eventPrimary = eventTheme?.colors?.primary ?? "#4F5FFF";
              const eventBanner = eventTheme?.bannerUrl as string | undefined;
              const hasDrawn = event.prizes.some((p) => p.status === "DRAWN");
              return (
                <Link key={event.id} href={`/e/${event.slug}/painel`} className="event-card">
                  {hasDrawn && <span className="drawn-badge">🎉 Sorteado</span>}
                  {eventBanner ? (
                    <img src={eventBanner} alt="" className="event-banner-img" />
                  ) : (
                    <div className="event-banner" style={{ background: eventPrimary }} />
                  )}
                  <div className="event-info">
                    {event.campaign && <span className="campaign">{event.campaign}</span>}
                    <h3>{event.name}</h3>
                    <span className="cta">{event.active ? "Ver sorteio →" : "Ver resultado →"}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {games.length > 0 && (
          <>
            <h2 className="section-spaced">Universo AS desta experiência</h2>
            <div className="games-grid">
              {games.map((game) => (
                <Link key={game.id} href={`/universo-as/jogos/${game.slug}`} className="game-card">
                  <div
                    className="game-banner"
                    style={{
                      background: game.theme
                        ? `linear-gradient(160deg, ${(game.theme as any)?.primaryColor || "#3B55E6"}, ${
                            (game.theme as any)?.secondaryColor || "#0c2a5b"
                          })`
                        : `linear-gradient(160deg, ${primary}, ${secondary})`,
                    }}
                  />
                  <div className="game-info">
                    <p className="game-name">{game.name}</p>
                    <p className="game-meta">
                      {game.phases.length} {game.phases.length === 1 ? "fase" : "fases"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        <h2 className="section-spaced">Ranking desta experiência</h2>
        <RankingList entries={ranking} highlightEmail={email} />
      </section>

      <style>{`
        .page {
          min-height: 100vh;
          background: radial-gradient(ellipse 80% 50% at 50% -10%, #1b2a5c 0%, #0a1330 55%, #05070f 100%);
          font-family: system-ui, sans-serif;
          color: #f5f6fa;
        }
        .hero {
          position: relative;
          padding: 3rem 2rem 2.5rem;
        }
        .hero-inner { max-width: 64rem; margin: 0 auto; position: relative; }
        .back-link {
          display: inline-block;
          color: rgba(255, 255, 255, 0.85);
          text-decoration: none;
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 1.2rem;
        }
        .back-link:hover { color: #fff; }
        .badge {
          display: inline-block;
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: rgba(0, 0, 0, 0.35);
          border-radius: 999px;
          padding: 0.28rem 0.7rem;
          margin-bottom: 0.9rem;
        }
        h1 {
          margin: 0 0 0.5rem;
          font-family: "Sora", system-ui, sans-serif;
          font-size: clamp(1.9rem, 3.8vw, 2.6rem);
          color: #fff;
        }
        .subtitle { margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 0.95rem; max-width: 32rem; }
        .content { max-width: 64rem; margin: 0 auto; padding: 2.5rem 2rem 6rem; }
        .description {
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.7;
          max-width: 42rem;
          margin: 0 0 2.5rem;
          white-space: pre-wrap;
        }
        h2 {
          font-family: "Sora", system-ui, sans-serif;
          font-size: 1.2rem;
          margin: 0 0 1.25rem;
        }
        .section-spaced { margin-top: 3rem; }
        .empty { color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; }
        .events-grid, .games-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
          gap: 1.25rem;
        }
        .event-card, .game-card {
          position: relative;
          display: block;
          text-decoration: none;
          color: inherit;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          overflow: hidden;
          transition: border-color 0.15s, transform 0.15s;
        }
        .event-card:hover, .game-card:hover {
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }
        .drawn-badge {
          position: absolute;
          top: 0.6rem;
          right: 0.6rem;
          z-index: 1;
          background: rgba(10, 15, 35, 0.85);
          border: 1px solid rgba(79, 95, 255, 0.5);
          color: #8b9aff;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.25rem 0.6rem;
          border-radius: 999px;
        }
        .event-banner, .event-banner-img, .game-banner { height: 6rem; }
        .event-banner-img { width: 100%; object-fit: cover; display: block; }
        .event-info, .game-info { padding: 1rem 1.1rem 1.2rem; }
        .campaign {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #8b9aff;
        }
        .event-info h3 { margin: 0.25rem 0 0.5rem; font-size: 1rem; }
        .cta { font-size: 0.8rem; color: #8b9aff; font-weight: 600; }
        .game-name { margin: 0 0 0.3rem; font-weight: 700; font-size: 0.95rem; }
        .game-meta { margin: 0; font-size: 0.78rem; opacity: 0.65; }
      `}</style>
    </main>
  );
}
