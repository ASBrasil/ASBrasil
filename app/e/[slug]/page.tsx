import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: { slug: string } }) {
  const event = await db.event.findUnique({
    where: { slug: params.slug },
    include: { prizes: { orderBy: { order: "asc" } } },
  });

  if (!event || !event.active) notFound();

  const theme = event.theme as any;
  const colors = theme?.colors ?? {};
  const bannerUrl = theme?.bannerUrl as string | undefined;

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
      {theme?.customCss && <style dangerouslySetInnerHTML={{ __html: theme.customCss }} />}

      <section className={`hero ${bannerUrl ? "has-banner" : ""}`}>
        {bannerUrl && (
          <>
            <img src={bannerUrl} alt="" className="hero-bg" />
            <div className="hero-scrim" />
          </>
        )}
        <div className="hero-content">
          {event.campaign && <span className="eyebrow">{event.campaign}</span>}
          <h1>{event.name}</h1>
          {event.description && <p className="description">{event.description}</p>}
          <a href={`/e/${event.slug}/vencedores`} className="winners-link">
            🏆 Ver vencedores
          </a>
        </div>
      </section>

      <section className="prizes">
        <h2>Prêmios em sorteio</h2>
        <div className="ticket-grid">
          {event.prizes.map((prize) => (
            <article className="ticket" key={prize.id}>
              <div className="ticket-main">
                <h3>{prize.name}</h3>
                {prize.description && <p>{prize.description}</p>}
              </div>
              <div className="ticket-perforation" aria-hidden />
              <div className="ticket-status">
                {prize.status === "DRAWN" ? (
                  <span className="badge drawn">Sorteado</span>
                ) : (
                  <span className="badge pending">
                    {prize.scheduledAt
                      ? new Date(prize.scheduledAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Em breve"}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="lookup-section">
        <div className="callout">
          <h2>Já se inscreveu?</h2>
          <p>Acompanhe seu número e o resultado de cada sorteio.</p>
          <a href="/entrar" className="callout-btn">
            Acompanhar meus sorteios →
          </a>
        </div>
      </section>

      <style>{`
        .hero {
          position: relative;
          padding: 5rem 1.5rem 3rem;
          text-align: center;
        }
        .hero.has-banner {
          padding: 0;
          min-height: min(32rem, 80vh);
          display: flex;
          align-items: flex-end;
          overflow: hidden;
        }
        .hero-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
        }
        .hero-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, var(--background) 96%);
          z-index: 1;
        }
        .hero-content {
          position: relative;
          z-index: 2;
          width: 100%;
        }
        .has-banner .hero-content {
          padding: 3rem 1.5rem 2.5rem;
        }
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 0.75rem;
          color: var(--primary);
        }
        h1 {
          font-family: var(--font-display, serif);
          font-size: clamp(2.2rem, 5vw, 3.5rem);
          margin: 0.5rem 0;
        }
        .description {
          max-width: 40rem;
          margin: 0 auto;
          opacity: 0.8;
        }
        .winners-link {
          display: inline-block;
          margin-top: 1.25rem;
          color: var(--primary);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .prizes {
          padding: 2rem 1.5rem 4rem;
          max-width: 64rem;
          margin: 0 auto;
        }
        .prizes h2 {
          font-family: var(--font-display, serif);
          margin-bottom: 1.5rem;
        }
        .ticket-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
          gap: 1.25rem;
        }
        .ticket {
          display: flex;
          background: var(--surface);
          border-radius: 0.75rem;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .ticket-main {
          flex: 1;
          padding: 1.25rem;
        }
        .ticket-main h3 {
          margin: 0 0 0.4rem;
        }
        .ticket-main p {
          margin: 0;
          font-size: 0.9rem;
          opacity: 0.75;
        }
        .ticket-perforation {
          width: 0;
          border-left: 2px dashed rgba(255, 255, 255, 0.2);
        }
        .ticket-status {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 1rem;
          writing-mode: vertical-rl;
        }
        .badge {
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }
        .badge.drawn {
          color: var(--primary);
        }
        .lookup-section {
          display: flex;
          justify-content: center;
          padding: 2rem 1.5rem 5rem;
        }
        .callout {
          background: var(--surface);
          border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
          border-radius: 1rem;
          padding: 1.75rem 2rem;
          text-align: center;
          max-width: 24rem;
        }
        .callout h2 {
          margin: 0 0 0.3rem;
          font-family: var(--font-display, serif);
          font-size: 1.25rem;
        }
        .callout p {
          margin: 0 0 1.2rem;
          opacity: 0.75;
          font-size: 0.9rem;
        }
        .callout-btn {
          display: inline-block;
          background: var(--primary);
          color: #12121a;
          text-decoration: none;
          font-weight: 600;
          padding: 0.65rem 1.3rem;
          border-radius: 999px;
          font-size: 0.9rem;
        }
      `}</style>
    </main>
  );
}
