import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { AnnouncementPopup } from "@/components/participant/AnnouncementPopup";

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
  const [rows, globalEvents] = await Promise.all([
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
  ]);

  const byEvent = new Map<
    string,
    { event: (typeof rows)[number]["event"]; numbers: number[] }
  >();
  for (const row of rows) {
    const entry = byEvent.get(row.event.id);
    if (entry) {
      entry.numbers.push(row.raffleNumber);
    } else {
      byEvent.set(row.event.id, { event: row.event, numbers: [row.raffleNumber] });
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
        <h1>Seus eventos</h1>
        <p className="subtitle">Escolha uma campanha para ver seus números e os sorteios.</p>

        {ativos.length === 0 && historico.length === 0 ? (
          <p className="empty">Nenhuma campanha encontrada para esse e-mail.</p>
        ) : (
          <div className="grid">
            {ativos.map(({ event, numbers }) => (
              <EventCard key={event.id} event={event} numbers={numbers} />
            ))}
          </div>
        )}

        {historico.length > 0 && (
          <>
            <h2>Histórico</h2>
            <div className="grid">
              {historico.map(({ event, numbers }) => (
                <EventCard key={event.id} event={event} numbers={numbers} muted />
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
        .page { min-height: 100vh; background: #f7f8fb; font-family: system-ui, sans-serif; }
        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.75rem;
          background: white;
          border-bottom: 1px solid #e6e8f0;
          font-size: 0.85rem;
          color: #6b7280;
        }
        .logout {
          background: none;
          border: 1px solid #e6e8f0;
          border-radius: 0.5rem;
          padding: 0.4rem 0.9rem;
          cursor: pointer;
          font-size: 0.8rem;
        }
        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .reservas {
          color: #4f5fff;
          text-decoration: none;
          border: 1px solid #e6e8f0;
          border-radius: 0.5rem;
          padding: 0.4rem 0.9rem;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .reservas:hover {
          border-color: #4f5fff;
        }
        .content { max-width: 56rem; margin: 0 auto; padding: 3rem 1.75rem 5rem; }
        h1 { margin: 0 0 0.25rem; font-family: "Sora", system-ui, sans-serif; }
        h2 { margin: 3rem 0 0.25rem; font-family: "Sora", system-ui, sans-serif; font-size: 1.25rem; }
        .subtitle { color: #6b7280; margin-bottom: 2rem; }
        .subtitle.small { margin-bottom: 1.25rem; font-size: 0.9rem; }
        .empty { color: #6b7280; }
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
          color: #12172b;
          background: white;
          border: 1px solid #e6e8f0;
          border-radius: 1rem;
          overflow: hidden;
          display: block;
        }
        .card:hover {
          border-color: #4f5fff;
        }
        .card.muted {
          opacity: 0.75;
        }
        .card.vip {
          border: 1.5px solid transparent;
          background:
            linear-gradient(white, white) padding-box,
            linear-gradient(135deg, #e8b646, #c9962f) border-box;
          box-shadow: 0 0.4rem 1.2rem rgba(232, 182, 70, 0.25);
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
          box-shadow: 0 0.2rem 0.5rem rgba(0, 0, 0, 0.15);
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
          color: #4f5fff;
        }
        .info h3 {
          margin: 0.25rem 0 0.5rem;
        }
        .number {
          font-size: 0.8rem;
          color: #6b7280;
          font-family: monospace;
        }
        .cta {
          font-size: 0.8rem;
          color: #4f5fff;
          font-weight: 600;
        }
      `}</style>
    </main>
  );
}

function EventCard({
  event,
  numbers,
  muted,
}: {
  event: { id: string; slug: string; name: string; campaign: string | null; theme: unknown };
  numbers: number[];
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
        <span className="number">
          {numbers.length === 1
            ? `Seu número: ${numbers[0]}`
            : `Seus números (${numbers.length}): ${numbers.join(", ")}`}
        </span>
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
