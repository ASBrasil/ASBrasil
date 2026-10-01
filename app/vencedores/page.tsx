import { db } from "@/lib/db";
import { ParticipantTopNav } from "@/components/participant/ParticipantTopNav";
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
    <main className="as-shell page">
      <ParticipantTopNav />

      <section className="hero">
        <span className="as-eyebrow">Universo AS</span>
        <h1 className="as-title">Vencedores dos nossos sorteios</h1>
        <p className="as-subtitle">
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
        <div className="as-container sections">
          {sections.map(({ event, winners }) => (
            <section key={event.id} className="event-section">
              <div className="event-header">
                {event.campaign && <span className="campaign">{event.campaign}</span>}
                <h2>{event.name}</h2>
              </div>
              <div className="winners-grid">
                {winners.map((w, i) => (
                  <article className="as-card as-card-hover winner-card" key={i}>
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
        .hero {
          text-align: center;
          padding: 3.5rem 1.5rem 1.5rem;
        }
        .hero .as-eyebrow, .hero .as-title, .hero .as-subtitle { display: block; }
        .hero .as-subtitle {
          max-width: 32rem;
          margin: 0.6rem auto 0;
        }
        .marquee-wrap {
          margin: 2rem 0 3.5rem;
        }
        .empty {
          text-align: center;
          color: var(--as-muted);
          padding: 3rem;
        }
        .sections {
          padding-bottom: 5rem;
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
          color: var(--as-cyan);
          border: 1px solid var(--as-line);
          border-radius: 999px;
          padding: 0.25rem 0.75rem;
          margin-bottom: 0.6rem;
        }
        .event-header h2 {
          font-family: var(--font-display);
          margin: 0;
          font-size: 1.35rem;
          color: var(--as-text);
        }
        .winners-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
          gap: 1.25rem;
        }
        .winner-card {
          overflow: hidden;
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
          background: var(--as-badge-bg);
        }
        .info {
          padding: 1.1rem 1.25rem;
        }
        .prize {
          display: inline-block;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--as-cyan);
          border: 1px solid var(--as-line);
          border-radius: 999px;
          padding: 0.2rem 0.65rem;
        }
        .info h3 {
          margin: 0.3rem 0;
          color: var(--as-text);
        }
        .number {
          font-size: 0.8rem;
          color: var(--as-muted);
          font-family: var(--font-mono, monospace);
        }
      `}</style>
    </main>
  );
}
