import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { ParticipantTopNav } from "@/components/participant/ParticipantTopNav";
import { PrizePath, PathStep } from "@/components/participant/PrizePath";

export default async function ParticipantEventPage({ params }: { params: { slug: string } }) {
  const email = await getParticipantEmail();
  if (!email) redirect("/entrar");

  const event = await db.event.findUnique({
    where: { slug: params.slug },
    include: { prizes: { orderBy: { order: "asc" } } },
  });
  if (!event || !event.active) notFound();

  const participant = await db.participant.findUnique({
    where: { eventId_email: { eventId: event.id, email } },
  });
  if (!participant) redirect("/meus-eventos");

  const drawResults = await db.drawResult.findMany({
    where: { prizeId: { in: event.prizes.map((p) => p.id) }, voided: false },
  });

  let currentAssigned = false;
  const steps: PathStep[] = event.prizes.map((prize) => {
    const result = drawResults.find((r) => r.prizeId === prize.id);
    if (result) {
      return {
        id: prize.id,
        name: prize.name,
        order: prize.order,
        state: "completed",
        won: result.participantId === participant.id,
      };
    }
    if (!currentAssigned) {
      currentAssigned = true;
      return { id: prize.id, name: prize.name, order: prize.order, state: "current", won: false };
    }
    return { id: prize.id, name: prize.name, order: prize.order, state: "locked", won: false };
  });

  const theme = event.theme as any;
  const colors = theme?.colors ?? {};

  return (
    <main
      style={
        {
          "--primary": colors.primary ?? "#4F5FFF",
          background: colors.background ?? "#0A1330",
          color: colors.text ?? "#F5F6FA",
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
        } as React.CSSProperties
      }
    >
      <ParticipantTopNav eventName={event.name} />

      <section className="hero">
        {event.campaign && <span className="eyebrow">{event.campaign}</span>}
        <h1>{event.name}</h1>
        <div className="number-pill">
          Seu número é: <strong>{participant.raffleNumber}</strong>
        </div>
      </section>

      <section className="path-section">
        <h2>Seus sorteios</h2>
        {steps.length === 0 ? (
          <p className="empty">Nenhum prêmio cadastrado ainda.</p>
        ) : (
          <PrizePath slug={event.slug} steps={steps} />
        )}
      </section>

      <style>{`
        .hero {
          padding: 3rem 1.5rem 1.5rem;
          text-align: center;
        }
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-size: 0.7rem;
          color: var(--primary);
        }
        h1 {
          font-family: "Sora", system-ui, sans-serif;
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          margin: 0.5rem 0 1.25rem;
        }
        .number-pill {
          display: inline-block;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          padding: 0.6rem 1.4rem;
          font-size: 0.9rem;
        }
        .number-pill strong {
          font-family: monospace;
          color: var(--primary);
          font-size: 1.1rem;
          margin-left: 0.3rem;
        }
        .path-section {
          max-width: 48rem;
          margin: 0 auto;
          padding: 1rem 1.5rem 4rem;
        }
        h2 {
          font-size: 1rem;
          opacity: 0.75;
          font-weight: 500;
        }
        .empty {
          opacity: 0.6;
        }
      `}</style>
    </main>
  );
}
