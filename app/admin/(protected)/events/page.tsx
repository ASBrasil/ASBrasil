import Link from "next/link";
import { db } from "@/lib/db";
import { EventCard } from "@/components/EventCard";
import { HeroFeaturedRow } from "@/components/admin/HeroFeaturedRow";

export const dynamic = "force-dynamic";

export default async function EventsListPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = searchParams.tab === "archived" ? "archived" : searchParams.tab === "banners" ? "banners" : "active";

  if (tab === "banners") {
    const events = await db.event.findMany({
      where: { archived: false, active: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: { id: true, name: true, campaign: true, heroFeatured: true, theme: true },
    });

    const rows = events.map((e) => {
      const theme = e.theme as any;
      return {
        id: e.id,
        name: e.name,
        campaign: e.campaign,
        heroFeatured: e.heroFeatured,
        bannerUrl: (theme?.bannerUrl as string | undefined) ?? null,
        primary: theme?.colors?.primary ?? "#4F5FFF",
      };
    });

    return (
      <div>
        <Header />
        <Tabs tab={tab} />
        <p className="banners-hint">
          Escolha quais eventos aparecem no carrossel do topo de "Meus Eventos" - a imagem usada é
          a mesma do banner configurado em Editar → Tema.
        </p>
        {rows.length === 0 ? (
          <div className="empty">
            <p>Nenhum evento publicado no momento.</p>
          </div>
        ) : (
          <div className="banner-list">
            {rows.map((event) => (
              <HeroFeaturedRow key={event.id} event={event} />
            ))}
          </div>
        )}
        <PageStyles />
      </div>
    );
  }

  const showArchived = tab === "archived";
  const events = await db.event.findMany({
    where: { archived: showArchived },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { participants: true, prizes: true } } },
  });

  return (
    <div>
      <Header />
      <Tabs tab={tab} />

      {events.length === 0 ? (
        <div className="empty">
          <p>
            {showArchived
              ? "Nenhum evento arquivado."
              : "Nenhum evento ainda. Crie o primeiro para começar a sortear."}
          </p>
        </div>
      ) : (
        <div className="grid">
          {events.map((event, i) => {
            const theme = event.theme as any;
            return (
              <EventCard
                key={event.id}
                event={{
                  id: event.id,
                  name: event.name,
                  campaign: event.campaign,
                  active: event.active,
                  archived: event.archived,
                  heroFeatured: event.heroFeatured,
                  bannerUrl: (theme?.bannerUrl as string | undefined) ?? null,
                  primary: theme?.colors?.primary ?? "#4F5FFF",
                  participantsCount: event._count.participants,
                  prizesCount: event._count.prizes,
                }}
                isFirst={i === 0}
                isLast={i === events.length - 1}
              />
            );
          })}
        </div>
      )}
      <PageStyles />
    </div>
  );
}

function Header() {
  return (
    <div className="header">
      <div>
        <h1>Eventos</h1>
        <p className="subtitle">Campanhas de sorteio criadas até agora.</p>
      </div>
      <Link href="/admin/events/new" className="new-btn">
        + Novo evento
      </Link>
    </div>
  );
}

function Tabs({ tab }: { tab: "active" | "archived" | "banners" }) {
  return (
    <div className="tabs">
      <Link href="/admin/events" className={`tab ${tab === "active" ? "active" : ""}`}>
        Ativos
      </Link>
      <Link href="/admin/events?tab=archived" className={`tab ${tab === "archived" ? "active" : ""}`}>
        Arquivados
      </Link>
      <Link href="/admin/events?tab=banners" className={`tab ${tab === "banners" ? "active" : ""}`}>
        Banners
      </Link>
    </div>
  );
}

function PageStyles() {
  return (
    <style>{`
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 2.5rem;
      }
      h1 { margin: 0 0 0.25rem; font-family: var(--font-display, inherit); }
      .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; }
      .new-btn {
        background: var(--indigo-600);
        color: white;
        text-decoration: none;
        padding: 0.7rem 1.3rem;
        border-radius: 999px;
        font-weight: 600;
        font-size: 0.9rem;
      }
      .tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid var(--border);
      }
      .tab {
        text-decoration: none;
        color: var(--text-muted);
        font-size: 0.85rem;
        font-weight: 600;
        padding: 0.6rem 0.9rem;
        border-bottom: 2px solid transparent;
      }
      .tab.active {
        color: var(--indigo-600);
        border-bottom-color: var(--indigo-600);
      }
      .empty {
        background: var(--surface);
        border: 1px dashed var(--border);
        border-radius: 1rem;
        padding: 3rem;
        text-align: center;
        color: var(--text-muted);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(22rem, 1fr));
        gap: 1.25rem;
      }
      .banners-hint {
        color: var(--text-muted);
        font-size: 0.88rem;
        max-width: 40rem;
        margin: -0.75rem 0 1.5rem;
      }
      .banner-list {
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
        max-width: 44rem;
      }
    `}</style>
  );
}
