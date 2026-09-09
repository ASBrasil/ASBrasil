import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { AnnouncementPopup } from "@/components/participant/AnnouncementPopup";
import { TicketBreakdown } from "@/components/TicketBreakdown";
import { EventsCarousel } from "@/components/participant/EventsCarousel";
import { ParticipantTopNav } from "@/components/participant/ParticipantTopNav";
import { HeroBanner, type HeroSlide } from "@/components/participant/HeroBanner";

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
    // do BTS aparecem juntos como uma experiência "BTS"). Busca os IDs dos
    // eventos (não só a contagem) pra dar pra calcular, mais abaixo, quantos
    // desses a própria pessoa já participa - vira o indicador de progresso.
    db.experience.findMany({
      where: { active: true, events: { some: { archived: false } } },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        subtitle: true,
        theme: true,
        events: { where: { archived: false }, select: { id: true } },
      },
    }),
  ]);

  // Um carrossel só no topo, misturando Experiências e sorteios em destaque
  // (Event.heroFeatured) - antes eram dois carrosséis empilhados (um
  // edge-to-edge, outro encaixotado logo abaixo), dando impressão de dois
  // banners brigando pela atenção. Experiências vêm primeiro.
  const heroSlides: HeroSlide[] = [
    ...experiences.map((exp) => {
      const theme = exp.theme as any;
      return {
        id: exp.id,
        href: `/eventos/${exp.slug}`,
        badge: "Experiência",
        name: exp.name,
        subtitle: exp.subtitle,
        ctaLabel: "Ver experiência →",
        bannerUrl: (theme?.backgroundImageUrl as string | undefined) ?? null,
        primary: theme?.primaryColor || "#3B55E6",
        secondary: theme?.secondaryColor || "#0c2a5b",
      };
    }),
    ...heroEventsRaw.map((e) => {
      const theme = e.theme as any;
      return {
        id: e.id,
        href: `/e/${e.slug}/painel`,
        badge: e.campaign ?? null,
        name: e.name,
        subtitle: null,
        ctaLabel: "Ver sorteio →",
        bannerUrl: (theme?.bannerUrl as string | undefined) ?? null,
        primary: theme?.colors?.primary ?? "#4F5FFF",
        vip: e.vip,
      };
    }),
  ];

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

  // Resumo no topo da página - números da própria pessoa, não da plataforma
  // toda (não faz sentido mostrar "12.483 participantes" na home de alguém).
  const totalParticipacoes = rows.length;
  const totalSorteios = participations.length;
  const experienciasComProgresso = experiences.map((exp) => ({
    ...exp,
    totalEventos: exp.events.length,
    meusEventos: exp.events.filter((e) => myEventIds.has(e.id)).length,
  }));

  const discoverableAll = globalEvents.filter((e) => !myEventIds.has(e.id));
  // "Mais sorteios" só mostra o que ainda não foi sorteado - assim que sai
  // o primeiro resultado, o evento migra sozinho pra "Resultados".
  const discoverable = discoverableAll.filter((e) => !e.prizes.some((pr) => pr.status === "DRAWN"));
  const discoverableDrawn = discoverableAll.filter((e) => e.prizes.some((pr) => pr.status === "DRAWN"));

  return (
    <main className="page">
      <AnnouncementPopup popup={activePopup} />

      <ParticipantTopNav />

      {/* Banner de ponta a ponta - fica entre a barra de menu e o resto do
          conteúdo, misturando Experiências e sorteios em destaque num só
          carrossel. Um futuro "ticker" de atividade (ranking/conquistas
          passando) pode entrar aqui embaixo depois. */}
      <HeroBanner slides={heroSlides} />

      <section className="content">
        <div className="page-heading">
          <span className="eyebrow">Meus sorteios</span>
          <h1>Suas experiências</h1>
          <p className="subtitle">Acompanhe seus sorteios, números e conquistas em cada evento.</p>
          {totalSorteios > 0 && (
            <div className="stats-row">
              <div className="stat">
                <strong>{totalParticipacoes}</strong>
                <span>{totalParticipacoes === 1 ? "participação" : "participações"}</span>
              </div>
              <div className="stat">
                <strong>{totalSorteios}</strong>
                <span>{totalSorteios === 1 ? "sorteio" : "sorteios"}</span>
              </div>
              {experiences.length > 0 && (
                <div className="stat">
                  <strong>{experiences.length}</strong>
                  <span>{experiences.length === 1 ? "experiência" : "experiências"}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {experiences.length > 0 && (
          <>
            <div className="section-heading">
              <span className="eyebrow">Explore por experiência</span>
              <h2>Experiências</h2>
              <p className="subtitle small">
                Todos os sorteios de um mesmo evento reunidos aqui, com o Universo AS e o ranking
                daquele evento.
              </p>
            </div>
            <EventsCarousel>
              {experienciasComProgresso.map((exp) => (
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
        .content { max-width: 64rem; margin: 0 auto; padding: 2.5rem 2rem 6rem; }
        .page-heading { max-width: 34rem; margin-bottom: 2rem; }
        .stats-row { display: flex; gap: 1.75rem; margin-top: 1.4rem; flex-wrap: wrap; }
        .stat { display: flex; flex-direction: column; }
        .stat strong {
          font-family: "Sora", system-ui, sans-serif;
          font-size: 1.4rem;
          line-height: 1.2;
        }
        .stat span { font-size: 0.76rem; color: rgba(255, 255, 255, 0.55); }
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
        .section-heading { margin: 3.25rem 0 1.75rem; }
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
        /* Card de Experiência é o carro-chefe dessa tela - mais alto e com
           mais respiro que os cards de sorteio avulso, pra parecer mesmo
           uma campanha em destaque, não só mais um item na lista. */
        .card.exp-card .banner,
        .card.exp-card .banner-img {
          height: 9rem;
        }
        .card.exp-card .info {
          padding: 1.1rem 1.35rem 1.35rem;
        }
        .info {
          padding: 1rem 1.25rem 1.25rem;
        }
        .exp-progress {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin: 0.5rem 0 0.7rem;
        }
        .exp-dots { display: flex; gap: 0.3rem; }
        .exp-dots .dot {
          width: 0.45rem;
          height: 0.45rem;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.18);
        }
        .exp-dots .dot.filled {
          background: #8b9aff;
        }
        .exp-progress-label {
          font-size: 0.74rem;
          color: rgba(255, 255, 255, 0.55);
        }
        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: #12121a;
          background: #fff;
          border-radius: 999px;
          padding: 0.42rem 0.95rem;
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
    totalEventos: number;
    meusEventos: number;
  };
}) {
  const theme = experience.theme as any;
  const primary = theme?.primaryColor || "#3B55E6";
  const secondary = theme?.secondaryColor || "#0c2a5b";
  const bannerUrl = theme?.backgroundImageUrl as string | undefined;

  return (
    <Link href={`/eventos/${experience.slug}`} className="card exp-card">
      <span className="exp-badge">Experiência</span>
      {bannerUrl ? (
        <img src={bannerUrl} alt="" className="banner-img" />
      ) : (
        <div className="banner" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }} />
      )}
      <div className="info">
        <h3>{experience.name}</h3>
        {experience.subtitle && <p className="number">{experience.subtitle}</p>}
        <div className="exp-progress">
          <span className="exp-dots">
            {Array.from({ length: experience.totalEventos }).map((_, i) => (
              <span key={i} className={`dot ${i < experience.meusEventos ? "filled" : ""}`} />
            ))}
          </span>
          <span className="exp-progress-label">
            {experience.meusEventos > 0
              ? `Você participou de ${experience.meusEventos}`
              : `${experience.totalEventos} ${experience.totalEventos === 1 ? "sorteio" : "sorteios"}`}
          </span>
        </div>
        <span className="cta-btn">Ver experiência →</span>
      </div>
    </Link>
  );
}
