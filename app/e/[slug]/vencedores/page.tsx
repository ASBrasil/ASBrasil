import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WinnersPage({ params }: { params: { slug: string } }) {
  const event = await db.event.findUnique({
    where: { slug: params.slug },
    include: {
      prizes: {
        include: {
          drawResults: {
            where: { voided: false, publishedAt: { not: null } },
            include: { participant: { select: { name: true } } },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!event || !event.active) notFound();

  const theme = event.theme as any;
  const colors = theme?.colors ?? {};

  const winners = event.prizes.flatMap((prize) =>
    prize.drawResults.map((result) => ({
      prizeName: prize.name,
      winnerName: result.participant.name,
      winningNumber: result.winningNumber,
      photoUrl: result.winnerPhotoUrl,
      drawnAt: result.drawnAt,
    }))
  );

  return (
    <main
      style={
        {
          "--primary": colors.primary ?? "#E8B646",
          "--background": colors.background ?? "#12121A",
          "--surface": colors.surface ?? "#1B1B26",
          "--text": colors.text ?? "#F5F0E6",
          background: "var(--background)",
          color: "var(--text)",
          minHeight: "100vh",
          fontFamily: "var(--font-body, system-ui, sans-serif)",
        } as React.CSSProperties
      }
    >
      <section className="hero">
        <Link href={`/e/${event.slug}`} className="back">
          ← {event.name}
        </Link>
        <h1>🏆 Vencedores</h1>
      </section>

      {winners.length === 0 ? (
        <p className="empty">Nenhum resultado publicado ainda. Volte em breve!</p>
      ) : (
        <section className="winners-grid">
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
        </section>
      )}

      <style>{`
        .hero {
          padding: 4rem 1.5rem 2rem;
          text-align: center;
        }
        .back {
          color: var(--primary);
          text-decoration: none;
          font-size: 0.85rem;
        }
        h1 {
          font-family: var(--font-display, serif);
          font-size: clamp(2rem, 5vw, 3rem);
          margin: 0.75rem 0 0;
        }
        .empty {
          text-align: center;
          opacity: 0.7;
          padding: 3rem;
        }
        .winners-grid {
          max-width: 60rem;
          margin: 0 auto;
          padding: 1rem 1.5rem 5rem;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
          gap: 1.25rem;
        }
        .winner-card {
          background: var(--surface);
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
          background: color-mix(in srgb, var(--primary) 15%, transparent);
        }
        .info {
          padding: 1.1rem 1.25rem;
        }
        .prize {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--primary);
        }
        .info h3 {
          margin: 0.3rem 0;
        }
        .number {
          font-size: 0.8rem;
          opacity: 0.7;
          font-family: var(--font-mono, monospace);
        }
      `}</style>
    </main>
  );
}
