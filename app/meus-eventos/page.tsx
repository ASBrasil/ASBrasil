import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";

export default async function MeusEventosPage() {
  const email = await getParticipantEmail();
  if (!email) redirect("/entrar");

  // A single e-mail can now own several Participant rows per event (one per
  // ticket), so this is grouped by event below instead of assuming one row
  // per event like it used to. Ordered by the event's own manual order
  // (set in the admin) so this matches whatever sequence was configured
  // there, not just "whichever ticket was created first".
  const rows = await db.participant.findMany({
    where: { email, event: { active: true } },
    include: { event: true },
    orderBy: { event: { order: "asc" } },
  });

  const byEvent = new Map<string, { event: (typeof rows)[number]["event"]; numbers: number[] }>();
  for (const row of rows) {
    const entry = byEvent.get(row.event.id);
    if (entry) {
      entry.numbers.push(row.raffleNumber);
    } else {
      byEvent.set(row.event.id, { event: row.event, numbers: [row.raffleNumber] });
    }
  }
  const participations = [...byEvent.values()];

  return (
    <main className="page">
      <header className="topbar">
        <span>Meus sorteios</span>
        <form action="/api/public/session" method="post">
          <button className="logout">Sair</button>
        </form>
      </header>

      <section className="content">
        <h1>Seus eventos</h1>
        <p className="subtitle">Escolha uma campanha para ver seus números e os sorteios.</p>

        {participations.length === 0 ? (
          <p className="empty">Nenhuma campanha ativa encontrada para esse e-mail.</p>
        ) : (
          <div className="grid">
            {participations.map(({ event, numbers }) => {
              const theme = event.theme as any;
              const primary = theme?.colors?.primary ?? "#4F5FFF";
              const bannerUrl = theme?.bannerUrl as string | undefined;
              return (
                <Link key={event.id} href={`/e/${event.slug}/painel`} className="card">
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
            })}
          </div>
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
        .content { max-width: 56rem; margin: 0 auto; padding: 3rem 1.75rem; }
        h1 { margin: 0 0 0.25rem; font-family: "Sora", system-ui, sans-serif; }
        .subtitle { color: #6b7280; margin-bottom: 2rem; }
        .empty { color: #6b7280; }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
          gap: 1.1rem;
        }
        .card {
          text-decoration: none;
          color: #12172b;
          background: white;
          border: 1px solid #e6e8f0;
          border-radius: 1rem;
          overflow: hidden;
        }
        .card:hover { border-color: #4f5fff; }
        .banner { height: 5rem; }
        .banner-img { width: 100%; height: 5rem; object-fit: cover; display: block; }
        .info { padding: 1rem 1.25rem 1.25rem; }
        .campaign { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #4f5fff; }
        .info h3 { margin: 0.25rem 0 0.5rem; }
        .number { font-size: 0.8rem; color: #6b7280; font-family: monospace; }
      `}</style>
    </main>
  );
}
