import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { ParticipantTopNav } from "@/components/participant/ParticipantTopNav";
import { Countdown } from "@/components/participant/Countdown";

export default async function ParticipantPrizePage({
  params,
}: {
  params: { slug: string; prizeId: string };
}) {
  const email = await getParticipantEmail();
  if (!email) redirect("/entrar");

  const event = await db.event.findUnique({ where: { slug: params.slug } });
  if (!event || !event.active) notFound();

  const participant = await db.participant.findUnique({
    where: { eventId_email: { eventId: event.id, email } },
  });
  if (!participant) redirect("/meus-eventos");

  const prize = await db.prize.findUnique({ where: { id: params.prizeId } });
  if (!prize || prize.eventId !== event.id) notFound();

  const result = await db.drawResult.findFirst({
    where: { prizeId: prize.id, voided: false },
    include: { participant: { select: { name: true } } },
  });

  const theme = event.theme as any;
  const colors = theme?.colors ?? {};
  const won = result?.participantId === participant.id;

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

        {result ? (
          <div className="result">
            <span className="tag">Resultado</span>
            {won ? (
              <>
                <p className="big">🎉 Parabéns, você ganhou!</p>
                <p className="detail">Número sorteado: {result.winningNumber}</p>
              </>
            ) : (
              <>
                <p className="big">Dessa vez não foi você.</p>
                <p className="detail">
                  Vencedor(a): {result.participant.name} · Número {result.winningNumber}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="pending">
            <span className="tag">Ainda não sorteado</span>
            {prize.scheduledAt ? (
              <Countdown target={prize.scheduledAt.toISOString()} />
            ) : (
              <p className="detail">Data do sorteio ainda não definida.</p>
            )}
            <div className="number-pill">
              Seu número é: <strong>{participant.raffleNumber}</strong>
            </div>
          </div>
        )}
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
        .tag {
          display: inline-block;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--primary);
          margin-bottom: 1rem;
        }
        .big {
          font-size: 1.3rem;
          margin: 0.3rem 0;
        }
        .detail {
          opacity: 0.7;
          font-size: 0.9rem;
        }
        .pending .countdown {
          justify-content: center;
          margin: 0.5rem 0 1.5rem;
        }
        .number-pill {
          display: inline-block;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          padding: 0.6rem 1.4rem;
          font-size: 0.9rem;
          margin-top: 0.5rem;
        }
        .number-pill strong {
          font-family: monospace;
          color: var(--primary);
          font-size: 1.1rem;
          margin-left: 0.3rem;
        }
      `}</style>
    </main>
  );
}
