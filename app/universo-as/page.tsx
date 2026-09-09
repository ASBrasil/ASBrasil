import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { getSessionAdminId } from "@/lib/auth";
import { getGlobalRanking } from "@/lib/ranking";
import { ParticipantTopNav } from "@/components/participant/ParticipantTopNav";
import { RankingList } from "@/components/participant/RankingList";

export const dynamic = "force-dynamic";

export default async function UniversoAsPage() {
  const email = await getParticipantEmail();
  const adminId = await getSessionAdminId();
  if (!email && !adminId) redirect("/entrar");

  const isTester = email ? await db.gameTester.findUnique({ where: { email } }) : null;

  // LIVE é público pra qualquer pessoa do Universo AS - é o objetivo do
  // recurso. TESTING e DRAFT (jogo ainda não anunciado/em construção) só
  // pra quem está na lista de testadores ou é admin - participante comum
  // nunca vê rascunho.
  const visibilities: string[] = ["LIVE"];
  if (adminId || isTester) {
    visibilities.push("TESTING", "DRAFT");
  }

  const [games, cards, ownedCards, ranking] = await Promise.all([
    db.game.findMany({
      where: { visibility: { in: visibilities as any } },
      include: { event: { select: { name: true } }, phases: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.gameCard.findMany({ orderBy: { name: "asc" } }),
    email
      ? db.playerCard.findMany({ where: { email }, select: { cardId: true } })
      : Promise.resolve([]),
    getGlobalRanking(),
  ]);

  const ownedCardIds = new Set(ownedCards.map((c: { cardId: string }) => c.cardId));

  return (
    <main className="page">
      <ParticipantTopNav eventName="Universo AS" />

      <section className="content">
        <div className="page-heading">
          <span className="eyebrow">Jogue e colecione</span>
          <h1>🎮 Universo AS</h1>
          <p className="subtitle">
            Jogue os desafios de qualquer evento, ganhe cards pro seu álbum e, quando estiver
            inscrito no evento do jogo, concorra a números extras no sorteio.
          </p>
        </div>

        <h2>Ranking global</h2>
        <p className="ranking-hint">Soma de todos os eventos - jogue qualquer jogo pra entrar.</p>
        <RankingList entries={ranking} highlightEmail={email} />

        <h2 className="section-spaced">Jogos disponíveis</h2>
        {games.length === 0 ? (
          <p className="empty">Nenhum jogo disponível no momento - volte mais tarde!</p>
        ) : (
          <div className="games-grid">
            {games.map((game: any) => (
              <Link key={game.id} href={`/universo-as/jogos/${game.slug}`} className="game-card">
                <div
                  className="game-banner"
                  style={{
                    background: game.theme?.backgroundImageUrl
                      ? `linear-gradient(180deg, ${game.theme.primaryColor || "#3B55E6"}cc, ${
                          game.theme.secondaryColor || "#0c2a5b"
                        }cc), url(${game.theme.backgroundImageUrl}) center/cover`
                      : `linear-gradient(160deg, ${game.theme?.primaryColor || "#3B55E6"}, ${
                          game.theme?.secondaryColor || "#0c2a5b"
                        })`,
                  }}
                >
                  {game.visibility !== "LIVE" && (
                    <span className="vis-badge">{game.visibility === "DRAFT" ? "Rascunho" : "Teste"}</span>
                  )}
                </div>
                <div className="game-info">
                  <p className="game-name">{game.name}</p>
                  <p className="game-meta">
                    {game.event.name} · {game.phases.length}{" "}
                    {game.phases.length === 1 ? "fase" : "fases"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <h2 className="album-title">🎴 Meu álbum de figurinhas</h2>
        {cards.length === 0 ? (
          <p className="empty">Ainda não existe nenhuma carta no álbum do Universo AS.</p>
        ) : (
          <div className="album-grid">
            {cards.map((card: any) => {
              const owned = ownedCardIds.has(card.id);
              return (
                <div key={card.id} className={`album-card ${owned ? "owned" : "locked"}`}>
                  {owned && card.imageUrl ? (
                    <img src={card.imageUrl} alt={card.name} className="album-thumb" />
                  ) : (
                    <div className="album-thumb placeholder">{owned ? "🎴" : "?"}</div>
                  )}
                  <p className="album-name">{owned ? card.name : "???"}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <style>{`
        .page {
          min-height: 100vh;
          background: radial-gradient(ellipse 80% 50% at 50% -10%, #1b2a5c 0%, #0a1330 55%, #05070f 100%);
          font-family: system-ui, sans-serif;
          color: #f5f6fa;
        }
        .content { max-width: 64rem; margin: 0 auto; padding: 3rem 2rem 6rem; }
        .page-heading { max-width: 34rem; margin-bottom: 2.5rem; }
        .eyebrow {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #8b9aff;
          margin-bottom: 0.6rem;
        }
        h1 { margin: 0 0 0.6rem; font-family: "Sora", system-ui, sans-serif; font-size: clamp(1.8rem, 3.5vw, 2.4rem); }
        .subtitle { color: rgba(255, 255, 255, 0.6); margin: 0; line-height: 1.6; }
        h2 {
          font-family: "Sora", system-ui, sans-serif;
          font-size: 1.15rem;
          margin: 0 0 1.25rem;
        }
        .album-title, .section-spaced { margin-top: 3rem; }
        .ranking-hint { color: rgba(255, 255, 255, 0.55); font-size: 0.8rem; margin: -0.75rem 0 1.25rem; }
        .empty { color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; }
        .games-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
          gap: 1.25rem;
        }
        .game-card {
          display: block;
          text-decoration: none;
          color: inherit;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          overflow: hidden;
          transition: border-color 0.15s, transform 0.15s;
        }
        .game-card:hover {
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }
        .game-banner {
          height: 6rem;
          position: relative;
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
          padding: 0.6rem;
        }
        .vis-badge {
          font-size: 0.65rem;
          font-weight: 700;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 999px;
          padding: 0.2rem 0.6rem;
          text-transform: uppercase;
        }
        .game-info { padding: 1rem 1.1rem 1.2rem; }
        .game-name { margin: 0 0 0.3rem; font-weight: 700; font-size: 0.95rem; }
        .game-meta { margin: 0; font-size: 0.78rem; opacity: 0.65; }
        .album-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
          gap: 1rem;
        }
        .album-card { text-align: center; }
        .album-thumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          object-fit: cover;
          border-radius: 0.7rem;
          margin-bottom: 0.4rem;
        }
        .album-thumb.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px dashed rgba(255, 255, 255, 0.15);
        }
        .album-card.locked .album-thumb.placeholder { opacity: 0.5; }
        .album-name { margin: 0; font-size: 0.75rem; opacity: 0.75; }
        .album-card.locked .album-name { opacity: 0.4; }
      `}</style>
    </main>
  );
}
