import { db } from "@/lib/db";
import Link from "next/link";
import { WinnersMarquee } from "@/components/participant/WinnersMarquee";

export const dynamic = "force-dynamic";

export default async function GlobalWinnersPage() {
  // Todo evento ativo e não arquivado, com pelo menos um resultado
  // publicado - cruza tudo, independente de quem está vendo participar ou
  // não daquele evento especificamente. "Publicado" é a régua: o admin
  // decide quando um resultado fica público clicando em "Publicar
  // resultado" no painel dele, então isso nunca vaza um sorteio antes da
  // hora.
  const events = await db.event.findMany({
    where: {
      active: true,
      archived: false,
      prizes: { some: { drawResults: { some: { voided: false, publishedAt: { not: null } } } } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      prizes: {
        orderBy: { order: "asc" },
        include: {
          drawResults: {
            where: { voided: false, publishedAt: { not: null } },
            include: { participant: { select: { name: true } } },
          },
        },
      },
    },
  });

  const sections = events
    .map((event) => ({
      event,
      winners: event.prizes.flatMap((prize) =>
        prize.drawResults.map((result) => ({
          prizeName: prize.name,
          winnerName: result.participant.name,
          winningNumber: result.winningNumber,
          photoUrl: result.winnerPhotoUrl,
        }))
      ),
    }))
    .filter((s) => s.winners.length > 0);

  const marqueeItems = sections.flatMap((s) => s.winners.map((w) => `${w.winnerName} · ${w.prizeName}`));

  return (
    <main className="page">
      <header className="topbar">
        <Link href="/meus-eventos" className="brand">
          <span aria-hidden className="dot">●</span>
          AS BRASIL
        </Link>
        <Link href="/meus-eventos" className="back">
          ← Voltar
        </Link>
      </header>

      <section className="hero">
        <h1>Vencedores dos nossos sorteios</h1>
        <p className="subtitle">
          Resultados publicados de todas as campanhas — inclusive as que você não está
          participando.
        </p>
      </section>

      {marqueeItems.length > 0 && (
        <div className="marquee-wrap">
          <WinnersMarquee items={marqueeItems} />
        </div>
      )}

      {sections.length === 0 ? (
        <p className="empty">Nenhum resultado publicado ainda. Volte em breve!</p>
      ) : (
        <div className="sections">
          {sections.map(({ event, winners }) => (
            <section key={event.id} className="event-section">
              <div className="event-header">
                {event.campaign && <span className="campaign">{event.campaign}</span>}
                <h2>{event.name}</h2>
              </div>
              <div className="winners-grid">
                {winners.map((w, i) => (
                  <article className="winner-card" key={i}>
                    {w.photoUrl ? (
                      <img src={w.photoUrl} alt={w.winnerName} className="photo" />
                    ) : (
                      <div className="photo placeholder">🎉</div>
                    )}
                    <div className="info">
                      <span className="prize">{w.prizeName}</span>
                      <h3>{w.winnerName}</h3>
                      <span className="number">Número sorteado: {w.winningNumber}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <style>{`
        .page {
          min-height: 100vh;
          background: radial-gradient(ellipse 80% 50% at 50% -10%, #1b2a5c 0%, #0a1330 55%, #05070f 100%);
          font-family: system-ui, sans-serif;
          color: #f5f6fa;
        }
        .topbar {
          position: sticky;
          top: 0;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.85rem 1.75rem;
          background: rgba(8, 12, 30, 0.72);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.85rem;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: white;
          text-decoration: none;
          font-weight: 800;
          font-size: 0.85rem;
          letter-spacing: 0.03em;
        }
        .brand .dot {
          color: #4f5fff;
        }
        .back {
          color: white;
          text-decoration: none;
          opacity: 0.8;
          font-weight: 600;
          font-size: 0.82rem;
        }
        .back:hover {
          opacity: 1;
        }
        .hero {
          text-align: center;
          padding: 3.5rem 1.5rem 1.5rem;
        }
        h1 {
          font-family: "Sora", system-ui, sans-serif;
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          margin: 0 0 0.5rem;
        }
        .subtitle {
          color: rgba(255, 255, 255, 0.6);
          max-width: 32rem;
          margin: 0 auto;
        }
        .marquee-wrap {
          margin: 2rem 0 3.5rem;
        }
        .empty {
          text-align: center;
          color: rgba(255, 255, 255, 0.6);
          padding: 3rem;
        }
        .sections {
          max-width: 64rem;
          margin: 0 auto;
          padding: 0 1.5rem 5rem;
        }
        .event-section {
          margin-bottom: 4rem;
        }
        .event-header {
          margin-bottom: 1.25rem;
        }
        .campaign {
          display: inline-block;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #8b9aff;
          border: 1px solid rgba(139, 154, 255, 0.4);
          border-radius: 999px;
          padding: 0.25rem 0.75rem;
          margin-bottom: 0.6rem;
        }
        .event-header h2 {
          font-family: "Sora", system-ui, sans-serif;
          margin: 0;
          font-size: 1.35rem;
        }
        .winners-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
          gap: 1.25rem;
        }
        .winner-card {
          background: #141b3d;
          border-radius: 0.9rem;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .photo {
          width: 100%;
          height: 12rem;
          object-fit: cover;
          display: block;
        }
        .photo.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          background: rgba(79, 95, 255, 0.12);
        }
        .info {
          padding: 1.1rem 1.25rem;
        }
        .prize {
          display: inline-block;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #8b9aff;
          border: 1px solid rgba(139, 154, 255, 0.35);
          border-radius: 999px;
          padding: 0.2rem 0.65rem;
        }
        .info h3 {
          margin: 0.3rem 0;
        }
        .number {
          font-size: 0.8rem;
          opacity: 0.65;
          font-family: var(--font-mono, monospace);
        }
      `}</style>
    </main>
  );
}
