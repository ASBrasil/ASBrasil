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

  // One e-mail can now hold several tickets (Participant rows) for the same
  // event, each with its own raffleNumber - so this is every row that
  // matches, not a single lookup.
  const myParticipants = await db.participant.findMany({
    where: { eventId: event.id, email },
    orderBy: { raffleNumber: "asc" },
  });
  if (myParticipants.length === 0) redirect("/meus-eventos");

  const myParticipantIds = new Set(myParticipants.map((p) => p.id));
  const myNumbers = myParticipants.map((p) => p.raffleNumber);

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
        imageUrl: prize.imageUrl,
        order: prize.order,
        state: "completed",
        won: myParticipantIds.has(result.participantId),
      };
    }
    if (!currentAssigned) {
      currentAssigned = true;
      return {
        id: prize.id,
        name: prize.name,
        imageUrl: prize.imageUrl,
        order: prize.order,
        state: "current",
        won: false,
      };
    }
    return {
      id: prize.id,
      name: prize.name,
      imageUrl: prize.imageUrl,
      order: prize.order,
      state: "locked",
      won: false,
    };
  });

  const theme = event.theme as any;
  const colors = theme?.colors ?? {};
  const bannerUrl = theme?.bannerUrl as string | undefined;

  return (
    <main
      style={
        {
          "--primary": colors.primary ?? "#4F5FFF",
          "--background": colors.background ?? "#0A1330",
          background: colors.background ?? "#0A1330",
          color: colors.text ?? "#F5F6FA",
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
        } as React.CSSProperties
      }
    >
      <ParticipantTopNav eventName={event.name} />

      <section className={`hero ${bannerUrl ? "has-banner" : ""}`}>
        {bannerUrl && (
          <>
            <img src={bannerUrl} alt="" className="hero-bg" />
            <div className="hero-scrim" />
          </>
        )}
        <div className="hero-content">
          {event.campaign && <span className="eyebrow">{event.campaign}</span>}
          <h1>{event.name}</h1>
        </div>
      </section>

      <section className="numbers-section">
        <div className="number-pill">
          {myNumbers.length === 1 ? (
            <>
              Seu número é: <strong>{myNumbers[0]}</strong>
            </>
          ) : (
            <>
              Seus números ({myNumbers.length}):{" "}
              <strong>{myNumbers.join(" · ")}</strong>
            </>
          )}
        </div>
        {myNumbers.length > 1 && (
          <p className="odds-note">Quanto mais números, mais chances em cada sorteio.</p>
        )}
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
          position: relative;
          padding: 3rem 1.5rem 1.5rem;
          text-align: center;
        }
        .hero.has-banner {
          padding: 0;
          min-height: min(24rem, 60vh);
          display: flex;
          align-items: flex-end;
          overflow: hidden;
        }
        .hero-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
        }
        .hero-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, var(--background, #0a1330) 95%);
          z-index: 1;
        }
        .hero-content {
          position: relative;
          z-index: 2;
          width: 100%;
        }
        .has-banner .hero-content {
          padding: 3rem 1.5rem 2rem;
        }
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-size: 0.7rem;
          color: var(--primary);
        }
        .hero h1 {
          font-family: "Sora", system-ui, sans-serif;
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          margin: 0.5rem 0 0;
        }
        .numbers-section {
          padding: 1.5rem 1.5rem 0.5rem;
          text-align: center;
        }
        .number-pill {
          display: inline-block;
          max-width: 32rem;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 1.5rem;
          padding: 0.6rem 1.4rem;
          font-size: 0.9rem;
          line-height: 1.6;
        }
        .number-pill strong {
          font-family: monospace;
          color: var(--primary);
          font-size: 1.1rem;
          margin-left: 0.3rem;
        }
        .odds-note {
          margin-top: 0.6rem;
          font-size: 0.8rem;
          opacity: 0.65;
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
