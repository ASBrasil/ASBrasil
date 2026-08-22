import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ScrollReveal } from "@/components/ScrollReveal";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { ResponsiveBanner } from "@/components/ResponsiveBanner";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: { slug: string } }) {
  const event = await db.event.findUnique({
    where: { slug: params.slug },
    include: {
      prizes: { orderBy: { order: "asc" } },
      _count: { select: { participants: true } },
    },
  });

  if (!event || !event.active) notFound();

  const theme = event.theme as any;
  const colors = theme?.colors ?? {};
  const bannerUrl = theme?.bannerUrl as string | undefined;
  const bannerUrlMobile = theme?.bannerUrlMobile as string | undefined;

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

      <div className="topbar">
        <span>{event.campaign || event.name}</span>
        <a href={`/e/${event.slug}/vencedores`}>🏆 Vencedores</a>
      </div>

      <section className={`hero ${bannerUrl ? "has-banner" : ""}`}>
        {bannerUrl && (
          <>
            <ResponsiveBanner desktopUrl={bannerUrl} mobileUrl={bannerUrlMobile} className="hero-bg" />
            <div className="hero-scrim" />
          </>
        )}
        <ScrollReveal className="hero-content">
          <h1>{event.name}</h1>
          {event.description && <p className="description">{event.description}</p>}
          {event.publicSignupEnabled && (
            <a href={`/e/${event.slug}/inscrever`} className="signup-cta">
              🎟️ Quero participar →
            </a>
          )}
        </ScrollReveal>
      </section>

      <ScrollReveal className="stats">
        <div className="stat">
          <strong>
            <AnimatedCounter target={event._count.participants} />
          </strong>
          <span>{event._count.participants === 1 ? "participante" : "participantes"}</span>
        </div>
        <div className="stat">
          <strong>
            <AnimatedCounter target={event.prizes.length} />
          </strong>
          <span>{event.prizes.length === 1 ? "prêmio em sorteio" : "prêmios em sorteio"}</span>
        </div>
      </ScrollReveal>

      {(event.lpBlocks as any[])?.length > 0 && (
        <section className="lp-blocks">
          {(event.lpBlocks as any[]).map((block, i) => (
            <ScrollReveal key={block.id} delay={i * 60} className="lp-block">
              {block.type === "text" && (
                <div className="lp-text">
                  {block.title && <h2>{block.title}</h2>}
                  {block.body && <p>{block.body}</p>}
                </div>
              )}
              {block.type === "image" && block.imageUrl && (
                <figure className="lp-image">
                  <img src={block.imageUrl} alt={block.caption || ""} />
                  {block.caption && <figcaption>{block.caption}</figcaption>}
                </figure>
              )}
              {block.type === "cards" && (
                <div className="lp-cards">
                  {(block.cards ?? []).map((card: any) => (
                    <div className="lp-card" key={card.id}>
                      {card.imageUrl && <img src={card.imageUrl} alt="" />}
                      <div className="lp-card-body">
                        {card.title && <h3>{card.title}</h3>}
                        {card.description && <p>{card.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollReveal>
          ))}
        </section>
      )}

      <ScrollReveal className="lookup-section">
        <div className="callout">
          <h2>Já se inscreveu?</h2>
          <p>Acompanhe seu número e o resultado de cada sorteio.</p>
          <a href="/entrar" className="callout-btn">
            Acompanhar meus sorteios →
          </a>
          {event.publicSignupEnabled && (
            <p className="signup-link-wrap">
              Ainda não se inscreveu?{" "}
              <a href={`/e/${event.slug}/inscrever`} className="signup-link">
                Inscreva-se aqui
              </a>
            </p>
          )}
        </div>
      </ScrollReveal>

      <style>{`
        .topbar {
          position: sticky;
          top: 0;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.65rem 1.25rem;
          background: rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.78rem;
        }
        .topbar span {
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 600;
          opacity: 0.8;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .topbar a {
          flex-shrink: 0;
          color: var(--primary);
          text-decoration: none;
          font-weight: 600;
        }
        .hero {
          position: relative;
          padding: 4rem 1.5rem 3rem;
          text-align: center;
        }
        .hero.has-banner {
          padding: 0;
          min-height: min(28rem, 70vh);
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
        .signup-cta {
          display: inline-block;
          margin-top: 1.5rem;
          background: var(--primary);
          color: #12121a;
          text-decoration: none;
          font-weight: 700;
          padding: 0.85rem 1.8rem;
          border-radius: 999px;
          font-size: 1rem;
          box-shadow: 0 0.5rem 1.5rem color-mix(in srgb, var(--primary) 40%, transparent);
        }
        .stats {
          display: flex;
          justify-content: center;
          gap: 3rem;
          padding: 0 1.5rem 2.5rem;
          text-align: center;
        }
        .stat strong {
          display: block;
          font-family: var(--font-display, serif);
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          color: var(--primary);
        }
        .stat span {
          font-size: 0.8rem;
          opacity: 0.65;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .lp-blocks {
          max-width: 48rem;
          margin: 0 auto;
          padding: 0 1.5rem 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
        }
        .lp-text h2 {
          font-family: var(--font-display, "Sora", serif);
          font-size: clamp(1.3rem, 3vw, 1.8rem);
          margin: 0 0 0.75rem;
        }
        .lp-text p {
          line-height: 1.7;
          opacity: 0.85;
          white-space: pre-wrap;
          margin: 0;
        }
        .lp-image img {
          width: 100%;
          border-radius: 1rem;
          display: block;
        }
        .lp-image figcaption {
          text-align: center;
          font-size: 0.8rem;
          opacity: 0.6;
          margin-top: 0.6rem;
        }
        .lp-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
          gap: 1.25rem;
        }
        .lp-card {
          background: var(--surface);
          border-radius: 1rem;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .lp-card img {
          width: 100%;
          aspect-ratio: 4 / 3;
          object-fit: cover;
          display: block;
        }
        .lp-card-body {
          padding: 1rem 1.1rem;
        }
        .lp-card-body h3 {
          margin: 0 0 0.4rem;
          font-size: 1rem;
        }
        .lp-card-body p {
          margin: 0;
          font-size: 0.85rem;
          opacity: 0.75;
          line-height: 1.5;
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
        .signup-link-wrap {
          margin: 1rem 0 0;
          font-size: 0.82rem;
          opacity: 0.7;
        }
        .signup-link {
          color: var(--primary);
          font-weight: 600;
        }
      `}</style>
    </main>
  );
}
