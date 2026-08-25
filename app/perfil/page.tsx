import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { ProfileForm } from "@/components/participant/ProfileForm";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendente de aprovação", color: "#e8b646" },
  APPROVED: { label: "Aprovado", color: "#4f5fff" },
  REJECTED: { label: "Recusado", color: "#f87171" },
};

export default async function PerfilPage() {
  const email = await getParticipantEmail();
  if (!email) redirect("/entrar");

  const rows = await db.participant.findMany({
    where: { email, event: { archived: false } },
    include: { event: { select: { id: true, slug: true, name: true, active: true } } },
    orderBy: { createdAt: "desc" },
  });

  const latest = rows[0];

  const byEvent = new Map<string, { name: string; slug: string; active: boolean; statuses: string[] }>();
  for (const row of rows) {
    const entry = byEvent.get(row.event.id);
    if (entry) {
      entry.statuses.push(row.moderationStatus);
    } else {
      byEvent.set(row.event.id, {
        name: row.event.name,
        slug: row.event.slug,
        active: row.event.active,
        statuses: [row.moderationStatus],
      });
    }
  }
  const events = [...byEvent.values()];

  return (
    <main className="page">
      <header className="topbar">
        <Link href="/meus-eventos" className="brand">
          <span aria-hidden className="dot">●</span>
          AS BRASIL
        </Link>
        <Link href="/meus-eventos" className="back">
          ← Voltar
        </Link>
      </header>

      <section className="content">
        <div className="page-heading">
          <span className="eyebrow">Sua conta</span>
          <h1>Meu perfil</h1>
          <p className="subtitle">Edite seus dados e veja de quais campanhas você já participou.</p>
        </div>

        <div className="columns">
          <div className="col">
            <h2>Dados pessoais</h2>
            <ProfileForm initialName={latest?.name ?? ""} initialPhone={latest?.phone ?? null} />
            <p className="email-note">E-mail: {email} (usado pra entrar, não pode ser alterado aqui)</p>
          </div>

          <div className="col">
            <h2>Suas participações</h2>
            {events.length === 0 ? (
              <p className="empty">Nenhuma participação encontrada.</p>
            ) : (
              <ul className="events-list">
                {events.map((e) => (
                  <li key={e.slug}>
                    <Link href={`/e/${e.slug}/painel`} className="event-link">
                      <span className="event-name">{e.name}</span>
                      {e.statuses.includes("PENDING") && (
                        <span className="status-tag" style={{ color: STATUS_LABEL.PENDING.color }}>
                          {STATUS_LABEL.PENDING.label}
                        </span>
                      )}
                      {!e.statuses.includes("PENDING") && e.statuses.includes("REJECTED") && (
                        <span className="status-tag" style={{ color: STATUS_LABEL.REJECTED.color }}>
                          {STATUS_LABEL.REJECTED.label}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
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
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.85rem 1.75rem;
          background: rgba(8, 12, 30, 0.72);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.85rem;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: white;
          text-decoration: none;
          font-weight: 800;
          font-size: 0.85rem;
          letter-spacing: 0.03em;
        }
        .brand .dot { color: #4f5fff; }
        .back {
          color: white;
          text-decoration: none;
          opacity: 0.8;
          font-weight: 600;
          font-size: 0.82rem;
        }
        .back:hover { opacity: 1; }
        .content { max-width: 56rem; margin: 0 auto; padding: 3.5rem 2rem 6rem; }
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
        .subtitle { color: rgba(255, 255, 255, 0.6); margin: 0; line-height: 1.6; }
        .columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
        }
        h2 {
          font-family: "Sora", system-ui, sans-serif;
          font-size: 1.15rem;
          margin: 0 0 1.25rem;
        }
        .email-note {
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 1rem;
        }
        .empty { color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; }
        .events-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .event-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          text-decoration: none;
          color: inherit;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0.6rem;
          padding: 0.85rem 1rem;
          transition: border-color 0.15s;
        }
        .event-link:hover {
          border-color: rgba(255, 255, 255, 0.25);
        }
        .event-name { font-weight: 600; font-size: 0.92rem; }
        .status-tag {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          white-space: nowrap;
        }
        @media (max-width: 700px) {
          .columns { grid-template-columns: 1fr; gap: 2.5rem; }
        }
      `}</style>
    </main>
  );
}
