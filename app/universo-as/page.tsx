import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { getSessionAdminId } from "@/lib/auth";
import { getGlobalRanking } from "@/lib/ranking";
import { ParticipantTopNav } from "@/components/participant/ParticipantTopNav";
import { RankingList } from "@/components/participant/RankingList";
import { IconController, IconCardBack } from "@/components/participant/GameIcons";

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
    <main className="as-shell page">
      <ParticipantTopNav eventName="Universo AS" />

      <section className="content">
        <div className="page-heading">
          <span className="as-eyebrow">Jogue e colecione</span>
          <h1 className="as-title">
            <IconController size={28} className="title-icon" />
            Universo AS
          </h1>
          <p className="as-subtitle">
            Jogue os desafios de qualquer evento, ganhe cards pro seu álbum e, quando estiver
            inscrito no evento do jogo, concorra a números extras no sorteio.
          </p>
        </div>

        <Link href="/universo-as/arcade" className="as-hero-mini arcade-banner">
          <div className="arcade-banner-text">
            <span className="arcade-banner-tag">Bônus - só diversão</span>
            <p className="arcade-banner-title">
              <IconController size={20} className="title-icon" />
              AS Game Universe
            </p>
            <p className="arcade-banner-desc">
              4 mini-jogos de arcade com os personagens do Universo AS. Não vale ticket nem
              pontuação no ranking - é só pra jogar.
            </p>
          </div>
          <span className="as-btn as-btn-secondary arcade-banner-cta">Jogar →</span>
        </Link>

        <h2>Ranking global</h2>
        <p className="ranking-hint">Soma de todos os eventos - jogue qualquer jogo pra entrar.</p>
        <RankingList entries={ranking} highlightEmail={email} />

        <h2 className="section-spaced">Jogos disponíveis</h2>
        {games.length === 0 ? (
          <p className="empty">Nenhum jogo disponível no momento - volte mais tarde!</p>
        ) : (
          <div className="games-grid">
            {games.map((game: any) => (
              <Link key={game.id} href={`/universo-as/jogos/${game.slug}`} className="as-card game-card">
                <div
                  className="game-banner"
                  style={{
                    background: game.theme?.backgroundImageUrl
                      ? `linear-gradient(180deg, ${game.theme.primaryColor || "#4f5fff"}cc, ${
                          game.theme.secondaryColor || "#0a1330"
                        }cc), url(${game.theme.backgroundImageUrl}) center/cover`
                      : `linear-gradient(160deg, ${game.theme?.primaryColor || "#4f5fff"}, ${
                          game.theme?.secondaryColor || "#0a1330"
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

        <h2 className="album-title">
          <IconCardBack size={19} className="title-icon" />
          Meu álbum de figurinhas
        </h2>
        {cards.length === 0 ? (
          <p className="empty">Ainda não existe nenhuma carta no álbum do Universo AS.</p>
        ) : (
          <div className="album-grid">
            {cards.map((card: any) => {
              const owned = ownedCardIds.has(card.id);
              return (
                <div key={card.id} className={`as-card album-card ${owned ? "owned" : "locked"}`}>
                  {owned && card.imageUrl ? (
                    <img src={card.imageUrl} alt={card.name} className="album-thumb" />
                  ) : (
                    <div className="album-thumb placeholder">
                      {owned ? <IconCardBack size={26} /> : "?"}
                    </div>
                  )}
                  <p className="album-name">{owned ? card.name : "???"}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <style>{`
        /* AS Brasil UI V4 (29/09) - tela migrada pro kit novo (ver
           app/globals.css e claude/pendencias-sorteios.md). .page só cuida
           do layout; o fundo escuro vem de .as-shell, aplicado no <main>. */
        .page {
          min-height: 100vh;
        }
        .content { max-width: 64rem; margin: 0 auto; padding: 3rem 2rem 6rem; }
        .page-heading { max-width: 34rem; margin-bottom: 2.5rem; }
        .page-heading .as-title { margin-bottom: 0.6rem; }
        h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: "Sora", system-ui, sans-serif;
          font-size: 1.15rem;
          margin: 0 0 1.25rem;
        }
        .title-icon { color: var(--as-cyan, #8b9aff); flex-shrink: 0; }
        .album-title, .section-spaced { margin-top: 3rem; }
        .ranking-hint { color: var(--as-muted, rgba(255, 255, 255, 0.55)); font-size: 0.8rem; margin: -0.75rem 0 1.25rem; }
        .empty { color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; }
        .games-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
          gap: 1.25rem;
        }
        .game-card {
          display: block;
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
        .game-meta { margin: 0; font-size: 0.78rem; color: var(--as-muted, rgba(255, 255, 255, 0.65)); }
        .album-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
          gap: 1rem;
        }
        .album-card { text-align: center; padding: 0.6rem; }
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
        /* Banner do arcade - reaproveita o visual "as-hero" (navy/violeta com
           brilho), mas em versão compacta pra caber numa faixa horizontal.
           O CTA usa as-btn-secondary (não o gradiente primary) porque o
           Paulo achou o botão colorido "muito claro" de mais aqui. */
        .arcade-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.25rem;
          text-decoration: none;
          color: inherit;
          padding: 1.1rem 1.4rem;
          margin-bottom: 2.5rem;
        }
        .as-hero-mini {
          position: relative;
          overflow: hidden;
          background: linear-gradient(120deg, #10264c 0%, #17245d 44%, #542d7a 100%);
          border: 1px solid rgba(143, 180, 255, 0.22);
          box-shadow: var(--as-shadow, 0 20px 60px rgba(0, 0, 0, 0.28));
          transition: transform 0.18s ease, border-color 0.18s ease;
        }
        .as-hero-mini:before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 78% 25%, rgba(77, 220, 255, 0.18), transparent 30%),
            radial-gradient(circle at 22% 110%, rgba(239, 95, 255, 0.18), transparent 35%);
          pointer-events: none;
        }
        .as-hero-mini > * { position: relative; z-index: 1; }
        .as-hero-mini:hover { transform: translateY(-2px); border-color: rgba(77, 220, 255, 0.35); }
        .arcade-banner-tag {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--as-yellow, #ffe56d);
          margin-bottom: 0.35rem;
        }
        .arcade-banner-title {
          margin: 0 0 0.3rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: "Sora", system-ui, sans-serif;
          font-weight: 700;
          font-size: 1.05rem;
        }
        .arcade-banner-desc { margin: 0; font-size: 0.8rem; color: var(--as-muted, rgba(255, 255, 255, 0.65)); max-width: 32rem; }
        .arcade-banner-cta {
          flex-shrink: 0;
          white-space: nowrap;
        }
        @media (max-width: 640px) {
          .arcade-banner { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </main>
  );
}
