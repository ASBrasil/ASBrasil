import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { AnnouncementPopup } from "@/components/participant/AnnouncementPopup";
import { TicketBreakdown } from "@/components/TicketBreakdown";
import { HeroCarousel } from "@/components/HeroCarousel";

export default async function MeusEventosPage() {
  const email = await getParticipantEmail();
  if (!email) redirect("/entrar");

  const activePopup = await db.popup.findFirst({ where: { active: true } });

  // A single e-mail can now own several Participant rows per event (one per
  // ticket), so this is grouped by event below instead of assuming one row
  // per event like it used to. Archived events are excluded entirely
  // (soft-deleted, shouldn't show anywhere); we no longer filter by
  // `active` here because concluded events should still show up under
  // "Histórico" - only drafts that never really launched get filtered out
  // below, via the "has at least one draw" check.
  const [rows, globalEvents, heroEventsRaw] = await Promise.all([
    db.participant.findMany({
      where: { email, event: { archived: false } },
      include: { event: { include: { prizes: { select: { status: true } } } } },
      orderBy: { event: { order: "asc" } },
    }),
    // "Mais sorteios": events the admin explicitly marked as globally
    // discoverable - shown to any known participant regardless of whether
    // they have a ticket here, not just people already registered.
    db.event.findMany({
      where: { global: true, active: true, archived: false },
      orderBy: [{ vip: "desc" }, { order: "asc" }],
    }),
    // Rotating hero at the top - admin-curated separately from
    // vip/global, full manual control over what gets this prime slot.
    db.event.findMany({
      where: { heroFeatured: true, active: true, archived: false },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: { id: true, slug: true, name: true, campaign: true, vip: true, theme: true },
    }),
  ]);

  const heroEvents = heroEventsRaw.map((e) => {
    const theme = e.theme as any;
    return {
      id: e.id,
      slug: e.slug,
      name: e.name,
      campaign: e.campaign,
      vip: e.vip,
      bannerUrl: (theme?.bannerUrl as string | undefined) ?? null,
      primary: theme?.colors?.primary ?? "#4F5FFF",
    };
  });

  const byEvent = new Map<
    string,
    { event: (typeof rows)[number]["event"]; tickets: { name: string; number: number }[] }
  >();
  for (const row of rows) {
    const entry = byEvent.get(row.event.id);
    const ticket = { name: row.name, number: row.raffleNumber };
    if (entry) {
      entry.tickets.push(ticket);
    } else {
      byEvent.set(row.event.id, { event: row.event, tickets: [ticket] });
    }
  }
  const participations = [...byEvent.values()];

  const ativos = participations.filter((p) => p.event.active);
  // "Passou": não está mais ativo, mas já teve pelo menos um sorteio de
  // verdade - distingue de um rascunho que nunca chegou a ser publicado
  // (esse não deveria aparecer em lugar nenhum).
  const historico = participations.filter(
    (p) => !p.event.active && p.event.prizes.some((pr) => pr.status === "DRAWN")
  );

  const myEventIds = new Set(participations.map((p) => p.event.id));
  const discoverable = globalEvents.filter((e) => !myEventIds.has(e.id));

  return (
    <main className="page">
      <AnnouncementPopup popup={activePopup} />

      <header className="topbar">
        <span>Meus sorteios</span>
        <div className="topbar-actions">
          <Link href="/vencedores" className="winners-link">
            🏆 Vencedores
          </Link>
          <a
            href="https://app.asbrasil.tur.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="reservas"
          >
            Minhas reservas ↗
          </a>
          <form action="/api/public/session" method="post">
            <button className="logout">Sair</button>
          </form>
        </div>
      </header>

      <section className="content">
        {heroEvents.length > 0 && <HeroCarousel events={heroEvents} />}

        <h1>Seus eventos</h1>
        <p className="subtitle">Escolha uma campanha para ver seus números e os sorteios.</p>

        {ativos.length === 0 && historico.length === 0 ? (
          <p className="empty">Nenhuma campanha encontrada para esse e-mail.</p>
        ) : (
          <div className="grid">
            {ativos.map(({ event, tickets }) => (
              <EventCard key={event.id} event={event} tickets={tickets} />
            ))}
          </div>
        )}

        {historico.length > 0 && (
          <>
            <h2>Histórico</h2>
            <div className="grid">
              {historico.map(({ event, tickets }) => (
                <EventCard key={event.id} event={event} tickets={tickets} muted />
              ))}
            </div>
          </>
        )}

        {discoverable.length > 0 && (
          <>
            <h2>Mais sorteios</h2>
            <p className="subtitle small">Campanhas abertas que você ainda não está participando.</p>
            <div className="grid">
              {discoverable.map((event) => (
                <DiscoverCard key={event.id} event={event} />
              ))}
            </div>
          </>
        )}
      </section>

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
          justify-content: space-between;
          align-items: center;
          padding: 0.9rem 1.75rem;
          background: rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.7);
        }
        .logout {
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          opacity: 0.85;
          border-radius: 999px;
          padding: 0.4rem 0.9rem;
          cursor: pointer;
          font-size: 0.78rem;
        }
        .logout:hover {
          opacity: 1;
          border-color: rgba(255, 255, 255, 0.4);
        }
        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .reservas {
          color: white;
          text-decoration: none;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 999px;
          padding: 0.4rem 0.9rem;
          font-size: 0.78rem;
          font-weight: 600;
          opacity: 0.9;
        }
        .reservas:hover {
          opacity: 1;
          border-color: rgba(255, 255, 255, 0.4);
        }
        .winners-link {
          color: #f5cf87;
          text-decoration: none;
          border: 1px solid rgba(232, 182, 70, 0.35);
          background: rgba(232, 182, 70, 0.1);
          border-radius: 999px;
          padding: 0.4rem 0.9rem;
          font-size: 0.78rem;
          font-weight: 700;
        }
        .winners-link:hover {
          border-color: rgba(232, 182, 70, 0.65);
        }
        .content { max-width: 60rem; margin: 0 auto; padding: 2.5rem 1.75rem 5rem; }
        h1 { margin: 0 0 0.25rem; font-family: "Sora", system-ui, sans-serif; }
        h2 { margin: 3rem 0 0.25rem; font-family: "Sora", system-ui, sans-serif; font-size: 1.25rem; }
        .subtitle { color: rgba(255, 255, 255, 0.6); margin-bottom: 2rem; }
        .subtitle.small { margin-bottom: 1.25rem; font-size: 0.9rem; }
        .empty { color: rgba(255, 255, 255, 0.6); }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
          gap: 1.1rem;
        }

        /* Cartões de evento (EventCard e DiscoverCard) - num bloco só, já
           que 'style jsx' exige Client Component e essa página inteira é
           Server Component (busca dados direto do banco). */
        .card {
          position: relative;
          text-decoration: none;
          color: #f5f6fa;
          background: #141b3d;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 1rem;
          overflow: hidden;
          display: block;
          transition: border-color 0.15s;
        }
        .card:hover {
          border-color: #4f5fff;
        }
        .card.muted {
          opacity: 0.65;
        }
        .card.vip {
          border: 1.5px solid transparent;
          background:
            linear-gradient(#141b3d, #141b3d) padding-box,
            linear-gradient(135deg, #e8b646, #c9962f) border-box;
          box-shadow: 0 0.4rem 1.2rem rgba(232, 182, 70, 0.15);
        }
        .vip-badge {
          position: absolute;
          top: 0.6rem;
          right: 0.6rem;
          z-index: 1;
          background: linear-gradient(135deg, #e8b646, #c9962f);
          color: #12121a;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.25rem 0.6rem;
          border-radius: 999px;
          box-shadow: 0 0.2rem 0.5rem rgba(0, 0, 0, 0.25);
        }
        .banner {
          height: 5rem;
        }
        .banner-img {
          width: 100%;
          height: 5rem;
          object-fit: cover;
          display: block;
        }
        .info {
          padding: 1rem 1.25rem 1.25rem;
        }
        .campaign {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #8b9aff;
        }
        .info h3 {
          margin: 0.25rem 0 0.5rem;
        }
        .number {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
          font-family: monospace;
        }
        .cta {
          font-size: 0.8rem;
          color: #8b9aff;
          font-weight: 600;
        }
      `}</style>
    </main>
  );
}

function EventCard({
  event,
  tickets,
  muted,
}: {
  event: { id: string; slug: string; name: string; campaign: string | null; theme: unknown };
  tickets: { name: string; number: number }[];
  muted?: boolean;
}) {
  const theme = event.theme as any;
  const primary = theme?.colors?.primary ?? "#4F5FFF";
  const bannerUrl = theme?.bannerUrl as string | undefined;

  return (
    <Link href={`/e/${event.slug}/painel`} className={`card ${muted ? "muted" : ""}`}>
      {bannerUrl ? (
        <img src={bannerUrl} alt="" className="banner-img" />
      ) : (
        <div className="banner" style={{ background: primary }} />
      )}
      <div className="info">
        {event.campaign && <span className="campaign">{event.campaign}</span>}
        <h3>{event.name}</h3>
        {tickets.length === 1 ? (
          <span className="number">Seu número: {tickets[0].number}</span>
        ) : (
          <TicketBreakdown tickets={tickets} />
        )}
      </div>
    </Link>
  );
}

function DiscoverCard({
  event,
}: {
  event: { id: string; slug: string; name: string; campaign: string | null; theme: unknown; vip: boolean };
}) {
  const theme = event.theme as any;
  const primary = theme?.colors?.primary ?? "#4F5FFF";
  const bannerUrl = theme?.bannerUrl as string | undefined;

  return (
    <Link href={`/e/${event.slug}/painel`} className={`card ${event.vip ? "vip" : ""}`}>
      {event.vip && <span className="vip-badge">💎 VIP</span>}
      {bannerUrl ? (
        <img src={bannerUrl} alt="" className="banner-img" />
      ) : (
        <div className="banner" style={{ background: primary }} />
      )}
      <div className="info">
        {event.campaign && <span className="campaign">{event.campaign}</span>}
        <h3>{event.name}</h3>
        <span className="cta">Ver como participar →</span>
      </div>
    </Link>
  );
}
