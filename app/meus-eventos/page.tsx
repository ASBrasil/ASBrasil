import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { AnnouncementPopup } from "@/components/participant/AnnouncementPopup";
import { TicketBreakdown } from "@/components/TicketBreakdown";
import { HeroCarousel } from "@/components/HeroCarousel";
import { EventsCarousel } from "@/components/participant/EventsCarousel";
import { ParticipantTopNav } from "@/components/participant/ParticipantTopNav";
import { ExperienceHeroCarousel } from "@/components/participant/ExperienceHeroCarousel";

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
  const [rows, globalEvents, heroEventsRaw, experiences] = await Promise.all([
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
      include: { prizes: { select: { status: true } } },
    }),
    // Rotating hero at the top - admin-curated separately from
    // vip/global, full manual control over what gets this prime slot.
    db.event.findMany({
      where: { heroFeatured: true, active: true, archived: false },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: { id: true, slug: true, name: true, campaign: true, vip: true, theme: true },
    }),
    // Experiências publicadas com pelo menos um sorteio ainda não arquivado
    // - agrupam vários sorteios do mesmo evento (ex: os 3 sorteios de Oreo
    // do BTS aparecem juntos como uma experiência "BTS").
    db.experience.findMany({
      where: { active: true, events: { some: { archived: false } } },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        subtitle: true,
        theme: true,
        _count: { select: { events: true } },
      },
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

  const experienceSlides = experiences.map((exp) => {
    const theme = exp.theme as any;
    return {
      id: exp.id,
      slug: exp.slug,
      name: exp.name,
      subtitle: exp.subtitle,
      bannerUrl: (theme?.backgroundImageUrl as string | undefined) ?? null,
      primary: theme?.primaryColor || "#3B55E6",
      secondary: theme?.secondaryColor || "#0c2a5b",
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
  const discoverableAll = globalEvents.filter((e) => !myEventIds.has(e.id));
  // "Mais sorteios" só mostra o que ainda não foi sorteado - assim que sai
  // o primeiro resultado, o evento migra sozinho pra "Resultados".
  const discoverable = discoverableAll.filter((e) => !e.prizes.some((pr) => pr.status === "DRAWN"));
  const discoverableDrawn = discoverableAll.filter((e) => e.prizes.some((pr) => pr.status === "DRAWN"));

  return (
    <main className="page">
      <AnnouncementPopup popup={activePopup} />

      <ParticipantTopNav />

      {/* Banner de ponta a ponta das Experiências - fica entre a barra de
          menu e o resto do conteúdo. Um futuro "ticker" de atividade
          (ranking/conquistas passando) pode entrar aqui embaixo depois. */}
      <ExperienceHeroCarousel slides={experienceSlides} />

      <section className="content">
        {heroEvents.length > 0 && <HeroCarousel events={heroEvents} />}

        <div className="page-heading">
          <span className="eyebrow">Meus sorteios</span>
          <h1>Seus eventos</h1>
          <p className="subtitle">Escolha uma campanha para ver seus números e os sorteios.</p>
        </div>

        {experiences.length > 0 && (
          <>
            <div className="section-heading">
              <span className="eyebrow">Organizado por evento</span>
              <h2>Experiências</h2>
              <p className="subtitle small">
                Vários sorteios do mesmo evento, agrupados num só lugar, com o Universo AS e o
                ranking daquele evento.
              </p>
            </div>
            <EventsCarousel>
              {experiences.map((exp) => (
                <ExperienceCard key={exp.id} experience={exp} />
              ))}
            </EventsCarousel>
          </>
        )}

        {ativos.length === 0 && historico.length === 0 && discoverable.length === 0 && discoverableDrawn.length === 0 ? (
          <p className="empty">Nenhuma campanha encontrada para esse e-mail.</p>
        ) : (
          <>
            {ativos.length > 0 && (
              <>
                <div className="section-heading">
                  <span className="eyebrow">Avulsos</span>
                  <h2>Seus sorteios</h2>
                </div>
                <EventsCarousel>
                  {ativos.map(({ event, tickets }) => (
                    <EventCard key={event.id} event={event} tickets={tickets} />
                  ))}
                </EventsCarousel>
              </>
            )}

            {discoverable.length > 0 && (
              <>
                <div className="section-heading">
                  <span className="eyebrow">Descubra</span>
                  <h2>Mais sorteios</h2>
                  <p className="subtitle small">Campanhas abertas que você ainda não está participando.</p>
                </div>
                <EventsCarousel>
                  {discoverable.map((event) => (
                    <DiscoverCard key={event.id} event={event} />
                  ))}
                </EventsCarousel>
              </>
            )}

            {(historico.length > 0 || discoverableDrawn.length > 0) && (
              <>
                <div className="section-heading">
                  <span className="eyebrow">Arquivo</span>
                  <h2>Resultados</h2>
                </div>
                <EventsCarousel>
                  {[
                    ...historico.map(({ event, tickets }) => (
                      <EventCard key={event.id} event={event} tickets={tickets} muted />
                    )),
                    ...discoverableDrawn.map((event) => (
                      <DiscoverCard key={event.id} event={event} drawn />
                    )),
                  ]}
                </EventsCarousel>
              </>
            )}
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
        .content { max-width: 64rem; margin: 0 auto; padding: 3.5rem 2rem 6rem; }
        .page-heading { max-width: 32rem; margin-bottom: 3rem; }
        .eyebrow {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #8b9aff;
          margin-bottom: 0.6rem;
        }
        h1 { margin: 0 0 0.6rem; font-family: "Sora", system-ui, sans-serif; font-size: clamp(1.8rem, 3.5vw, 2.4rem); }
        .section-heading { margin: 4.5rem 0 1.75rem; }
        h2 { margin: 0; font-family: "Sora", system-ui, sans-serif; font-size: 1.4rem; }
        .subtitle { color: rgba(255, 255, 255, 0.6); margin: 0; line-height: 1.6; }
        .subtitle.small { margin-top: 0.4rem; font-size: 0.9rem; }
        .empty { color: rgba(255, 255, 255, 0.6); }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
          gap: 1.35rem;
        }

        /* Cartões de evento (EventCard, DiscoverCard, ExperienceCard) - num
           bloco só, já que 'style jsx' exige Client Component e essa página
           inteira é Server Component (busca dados direto do banco). */
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
        .drawn-badge {
          position: absolute;
          top: 0.6rem;
          right: 0.6rem;
          z-index: 1;
          background: rgba(10, 15, 35, 0.85);
          border: 1px solid rgba(79, 95, 255, 0.5);
          color: #8b9aff;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.25rem 0.6rem;
          border-radius: 999px;
        }
        .exp-badge {
          position: absolute;
          top: 0.6rem;
          left: 0.6rem;
          z-index: 1;
          background: rgba(0, 0, 0, 0.45);
          color: #fff;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 0.22rem 0.55rem;
          border-radius: 999px;
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
  event: { id: string; slug: string; name: string; campaign: string | null; theme: unknown; prizes?: { status: string }[] };
  tickets: { name: string; number: number }[];
  muted?: boolean;
}) {
  const theme = event.theme as any;
  const primary = theme?.colors?.primary ?? "#4F5FFF";
  const bannerUrl = theme?.bannerUrl as string | undefined;
  const hasDrawn = (event.prizes ?? []).some((p) => p.status === "DRAWN");

  return (
    <Link href={`/e/${event.slug}/painel`} className={`card ${muted ? "muted" : ""}`}>
      {hasDrawn && <span className="drawn-badge">🎉 Sorteado</span>}
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
  drawn,
}: {
  event: { id: string; slug: string; name: string; campaign: string | null; theme: unknown; vip: boolean };
  drawn?: boolean;
}) {
  const theme = event.theme as any;
  const primary = theme?.colors?.primary ?? "#4F5FFF";
  const bannerUrl = theme?.bannerUrl as string | undefined;

  return (
    <Link href={`/e/${event.slug}/painel`} className={`card ${event.vip ? "vip" : ""} ${drawn ? "muted" : ""}`}>
      {event.vip && !drawn && <span className="vip-badge">💎 VIP</span>}
      {bannerUrl ? (
        <img src={bannerUrl} alt="" className="banner-img" />
      ) : (
        <div className="banner" style={{ background: primary }} />
      )}
      <div className="info">
        {event.campaign && <span className="campaign">{event.campaign}</span>}
        <h3>{event.name}</h3>
        <span className="cta">{drawn ? "Ver resultado →" : "Ver como participar →"}</span>
      </div>
    </Link>
  );
}

function ExperienceCard({
  experience,
}: {
  experience: {
    id: string;
    slug: string;
    name: string;
    subtitle: string | null;
    theme: unknown;
    _count: { events: number };
  };
}) {
  const theme = experience.theme as any;
  const primary = theme?.primaryColor || "#3B55E6";
  const secondary = theme?.secondaryColor || "#0c2a5b";
  const bannerUrl = theme?.backgroundImageUrl as string | undefined;

  return (
    <Link href={`/eventos/${experience.slug}`} className="card">
      <span className="exp-badge">Experiência</span>
      {bannerUrl ? (
        <img src={bannerUrl} alt="" className="banner-img" />
      ) : (
        <div className="banner" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }} />
      )}
      <div className="info">
        <h3>{experience.name}</h3>
        {experience.subtitle && <p className="number">{experience.subtitle}</p>}
        <span className="cta">
          {experience._count.events} {experience._count.events === 1 ? "sorteio" : "sorteios"} · Ver tudo →
        </span>
      </div>
    </Link>
  );
}
