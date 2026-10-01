import { db } from "@/lib/db";
import { FeaturedEventRow } from "@/components/admin/FeaturedEventRow";

export const dynamic = "force-dynamic";

export default async function FeaturedEventsPage() {
  const events = await db.event.findMany({
    where: { archived: false },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      campaign: true,
      active: true,
      featuredOnLogin: true,
      loginBannerText: true,
    },
  });

  return (
    <div>
      <div className="header">
        <span className="as-eyebrow">Configurações</span>
        <h1 className="as-title">Destaques da tela de login</h1>
        <p className="as-subtitle">
          Escolha quais sorteios aparecem no banner rotativo da página onde o participante digita
          o e-mail (<code>/entrar</code>), e escreva o texto que quiser pra cada um. Deixando em
          branco, usa “Campanha — Nome do sorteio” automaticamente.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="empty as-card">
          <p>Nenhum sorteio ativo no momento.</p>
        </div>
      ) : (
        <div className="list">
          {events.map((event) => (
            <FeaturedEventRow key={event.id} event={event} />
          ))}
        </div>
      )}

      <style>{`
        .header { margin-bottom: 1.75rem; max-width: 36rem; }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; }
        .subtitle code {
          background: var(--surface);
          padding: 0.1rem 0.4rem;
          border-radius: 0.3rem;
          font-size: 0.85em;
        }
        .empty {
          border: 1px dashed var(--border);
          padding: 3rem;
          text-align: center;
          color: var(--text-muted);
        }
        .list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          max-width: 36rem;
        }
      `}</style>
    </div>
  );
}
