import { ScrollReveal } from "@/components/ScrollReveal";
import { CardsCarousel } from "@/components/participant/CardsCarousel";

/**
 * Blocos salvos antes de "Cards" virar Grade/Carrossel ainda tem
 * type:"cards" no banco - trata como Grade aqui, senão simplesmente não
 * aparecem (nenhum dos dois tipos novos bate).
 */
function normalize(blocks: any[]): any[] {
  return blocks.map((b) => (b.type === "cards" ? { ...b, type: "cardsGrid", columns: b.columns ?? 4 } : b));
}

export function LpBlocksSection({ blocks: raw }: { blocks: unknown }) {
  const blocks = normalize((raw as any[]) ?? []);
  if (!blocks.length) return null;

  return (
    <section className="lp-blocks">
      {blocks.map((block, i) => (
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
          {block.type === "cardsGrid" && (() => {
            const cardCount = (block.cards ?? []).length || 1;
            const desktopCols = Math.max(1, Math.min(block.columns ?? 4, cardCount));
            const mobileCols = Math.max(1, Math.min(2, cardCount));
            return (
              <div
                className="lp-cards"
                style={{ "--cols": desktopCols, "--cols-mobile": mobileCols } as React.CSSProperties}
              >
                {(block.cards ?? []).map((card: any) => (
                  <div className="lp-card" key={card.id}>
                    {card.contentType === "html" && card.customHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: card.customHtml }} />
                    ) : (
                      card.imageUrl && <img src={card.imageUrl} alt="" />
                    )}
                    <div className="lp-card-body">
                      {card.title && <h3>{card.title}</h3>}
                      {card.description && <p>{card.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
          {block.type === "cardsCarousel" && (
            <CardsCarousel
              cards={block.cards ?? []}
              visibleCount={block.visibleCount ?? 3}
              autoplay={!!block.autoplay}
            />
          )}
        </ScrollReveal>
      ))}

      <style>{`
        .lp-blocks {
          max-width: 48rem;
          margin: 0 auto;
          padding: 0 1.5rem 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 3.5rem;
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
          grid-template-columns: repeat(var(--cols, auto-fit), 1fr);
          gap: 1.25rem;
        }
        @media (max-width: 640px) {
          .lp-cards {
            grid-template-columns: repeat(var(--cols-mobile, 2), 1fr) !important;
            gap: 0.75rem;
          }
        }
        .lp-card {
          background: var(--surface, #141b3d);
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
      `}</style>
    </section>
  );
}
