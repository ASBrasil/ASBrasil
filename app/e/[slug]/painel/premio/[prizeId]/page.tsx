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

  const result = await db.drawResult.findFirst({
    where: { prizeId: prize.id, voided: false },
    include: { participant: { select: { name: true } } },
  });

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
        <Link href={`/e/${event.slug}/painel`} className="back">
          ← {event.name}
        </Link>

        {/* espaço reservado para a imagem do prêmio, a ser definida depois */}
        <div className="prize-icon">🎁</div>
        <h1>{prize.name}</h1>
        {prize.description && <p className="description">{prize.description}</p>}

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
        />
      </section>

      <style>{`
        .content {
          max-width: 30rem;
          margin: 0 auto;
          padding: 2.5rem 1.5rem 4rem;
          text-align: center;
        }
        .back {
          display: inline-block;
          margin-bottom: 2rem;
          color: var(--primary);
          text-decoration: none;
          font-size: 0.85rem;
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
        h1 {
          font-family: "Sora", system-ui, sans-serif;
          margin: 0 0 0.5rem;
        }
        .description {
          opacity: 0.75;
          margin-bottom: 2rem;
        }
      `}</style>
    </main>
  );
}