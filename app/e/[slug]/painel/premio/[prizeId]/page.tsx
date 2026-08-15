import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { ParticipantTopNav } from "@/components/participant/ParticipantTopNav";
import { PrizeResultLive } from "@/components/participant/PrizeResultLive";

export default async function ParticipantPrizePage({
  params,
}: {
  params: { slug: string; prizeId: string };
}) {
  const email = await getParticipantEmail();
  if (!email) redirect("/entrar");

  const event = await db.event.findUnique({ where: { slug: params.slug } });
  if (!event || !event.active) notFound();

  const myParticipants = await db.participant.findMany({
    where: { eventId: event.id, email },
    orderBy: { raffleNumber: "asc" },
  });
  if (myParticipants.length === 0) redirect("/meus-eventos");

  const myParticipantIds = new Set(myParticipants.map((p) => p.id));
  const myNumbers = myParticipants.map((p) => p.raffleNumber);

  const prize = await db.prize.findUnique({ where: { id: params.prizeId } });
  if (!prize || prize.eventId !== event.id) notFound();

  const [result, allPrizes, drawResults] = await Promise.all([
    db.drawResult.findFirst({
      where: { prizeId: prize.id, voided: false },
      include: { participant: { select: { name: true } } },
    }),
    db.prize.findMany({ where: { eventId: event.id }, orderBy: { order: "asc" } }),
    db.drawResult.findMany({
      where: { prize: { eventId: event.id }, voided: false },
      select: { prizeId: true, participantId: true },
    }),
  ]);

  const theme = event.theme as any;
  const colors = theme?.colors ?? {};
  const won = result ? myParticipantIds.has(result.participantId) : false;

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

      <section className="content">
        <div className="prize-card">
          {prize.imageUrl ? (
            <img src={prize.imageUrl} alt="" className="prize-photo" />
          ) : (
            <div className="prize-icon">🎁</div>
          )}
          <h1>{prize.name}</h1>
          {prize.description && <p className="description">{prize.description}</p>}
        </div>

        <PrizeResultLive
          prizeId={prize.id}
          initialResult={
            result
              ? { winningNumber: result.winningNumber, winnerName: result.participant.name }
              : null
          }
          scheduledAt={prize.scheduledAt ? prize.scheduledAt.toISOString() : null}
          raffleNumbers={myNumbers}
          won={won}
          winMessage={prize.winMessage}
          loseMessage={prize.loseMessage}
          couponCode={prize.couponCode}
        />

        {allPrizes.length > 1 && (
          <div className="other-prizes">
            <span className="other-prizes-label">Outros sorteios deste evento</span>
            <div className="other-prizes-strip">
              {allPrizes.map((p) => {
                const pResult = drawResults.find((r) => r.prizeId === p.id);
                const isCurrent = p.id === prize.id;
                const isWinner = pResult ? myParticipantIds.has(pResult.participantId) : false;
                return (
                  <Link
                    key={p.id}
                    href={`/e/${event.slug}/painel/premio/${p.id}`}
                    className={`other-prize ${isCurrent ? "current" : ""}`}
                  >
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" className="other-prize-thumb" />
                    ) : (
                      <span className="other-prize-thumb placeholder">🎁</span>
                    )}
                    {pResult && (
                      <span className={`other-prize-badge ${isWinner ? "won" : ""}`}>
                        {isWinner ? "🏆" : "✓"}
                      </span>
                    )}
                    <span className="other-prize-name">{p.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <style>{`
        .content {
          max-width: 26rem;
          margin: 0 auto;
          padding: 1.25rem 1.25rem 4rem;
          text-align: center;
        }
        .prize-card {
          margin-bottom: 1.75rem;
        }
        .prize-icon {
          width: 4.5rem;
          height: 4.5rem;
          margin: 0 auto 1.25rem;
          border-radius: 1rem;
          background: rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
        }
        .prize-photo {
          width: 100%;
          max-width: 18rem;
          aspect-ratio: 4 / 3;
          object-fit: cover;
          margin: 0 auto 1.5rem;
          border-radius: 1rem;
          display: block;
          box-shadow: 0 1rem 2.5rem rgba(0, 0, 0, 0.35);
        }
        h1 {
          font-family: "Sora", system-ui, sans-serif;
          margin: 0 0 0.4rem;
          font-size: 1.4rem;
        }
        .description {
          opacity: 0.7;
          font-size: 0.9rem;
          margin: 0;
        }
        .other-prizes {
          margin-top: 3rem;
          padding-top: 1.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .other-prizes-label {
          display: block;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          opacity: 0.55;
          margin-bottom: 1rem;
        }
        .other-prizes-strip {
          display: flex;
          gap: 0.9rem;
          overflow-x: auto;
          padding-bottom: 0.25rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        .other-prize {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          text-decoration: none;
          color: inherit;
          flex-shrink: 0;
          width: 4.5rem;
          position: relative;
        }
        .other-prize-thumb {
          width: 3.25rem;
          height: 3.25rem;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid transparent;
        }
        .other-prize-thumb.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.08);
          font-size: 1.1rem;
        }
        .other-prize.current .other-prize-thumb {
          border-color: var(--primary);
        }
        .other-prize-badge {
          position: absolute;
          top: 2.3rem;
          left: 2.3rem;
          width: 1.2rem;
          height: 1.2rem;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
        }
        .other-prize-badge.won {
          background: #f59e0b;
        }
        .other-prize-name {
          font-size: 0.7rem;
          opacity: 0.75;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
        .other-prize.current .other-prize-name {
          opacity: 1;
          font-weight: 600;
        }
      `}</style>
    </main>
  );
}