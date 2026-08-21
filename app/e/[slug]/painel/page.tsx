import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { ParticipantTopNav } from "@/components/participant/ParticipantTopNav";
import { PrizePath, PathStep } from "@/components/participant/PrizePath";
import { MissionGate } from "@/components/participant/MissionGate";
import { SurpriseSection } from "@/components/participant/SurpriseSection";

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

  const theme = event.theme as any;
  const colors = theme?.colors ?? {};
  const bannerUrl = theme?.bannerUrl as string | undefined;

  // Sem ingresso: se o evento é global, mostra a tela de pré-requisito em
  // vez de simplesmente devolver a pessoa pra "Meus eventos" sem explicação
  // - é assim que ela descobre o que precisa fazer pra participar. Eventos
  // privados continuam se comportando como antes (não expõem nada a quem
  // não tem ingresso).
  if (myParticipants.length === 0) {
    if (!event.global) redirect("/meus-eventos");

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
            <h1>{event.name}</h1>
            {event.campaign && <span className="eyebrow">{event.campaign}</span>}
          </div>
        </section>

        <section className="prerequisite-section">
          {event.vip && <span className="vip-tag">💎 Sorteio VIP</span>}
          <h2>Você ainda não está participando</h2>
          <p className="prerequisite-text">
            {event.prerequisiteText ||
              "Esse sorteio tem um pré-requisito específico para participar. Fale com nosso time para saber como entrar."}
          </p>
          <a href="https://app.asbrasil.tur.br/" target="_blank" rel="noopener noreferrer" className="cta-btn">
            Minhas reservas ↗
          </a>
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
            background: linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.55) 55%, var(--background, #0a1330) 92%);
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
            display: block;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            font-size: 0.7rem;
            color: var(--primary);
            margin-top: 0.4rem;
          }
          .hero h1 {
            font-family: "Sora", system-ui, sans-serif;
            font-size: clamp(1.8rem, 4vw, 2.6rem);
            margin: 0;
          }
          .prerequisite-section {
            max-width: 30rem;
            margin: 0 auto;
            padding: 2.5rem 1.5rem 5rem;
            text-align: center;
          }
          .vip-tag {
            display: inline-block;
            background: linear-gradient(135deg, #e8b646, #c9962f);
            color: #12121a;
            font-size: 0.75rem;
            font-weight: 700;
            padding: 0.3rem 0.8rem;
            border-radius: 999px;
            margin-bottom: 1rem;
          }
          .prerequisite-section h2 {
            font-family: "Sora", system-ui, sans-serif;
            font-size: 1.3rem;
            margin: 0 0 0.75rem;
          }
          .prerequisite-text {
            opacity: 0.8;
            line-height: 1.6;
            margin: 0 0 1.75rem;
            white-space: pre-wrap;
          }
          .cta-btn {
            display: inline-block;
            background: var(--primary);
            color: #12121a;
            font-weight: 700;
            text-decoration: none;
            padding: 0.7rem 1.5rem;
            border-radius: 999px;
            font-size: 0.9rem;
          }
        `}</style>
      </main>
    );
  }

  const myParticipantIds = new Set(myParticipants.map((p) => p.id));
  const myNumbers = myParticipants.map((p) => p.raffleNumber);

  // Barreira de missões: se o evento exige pré-requisitos e ainda falta
  // alguma missão obrigatória pra esse e-mail, mostra a lista de missões em
  // vez dos números/sorteios - a pessoa só passa daqui depois de cumprir
  // tudo que for obrigatório (opcionais ficam visíveis mas não travam).
  // Missões com unlockAt (surpresas travadas por data) NUNCA entram aqui -
  // elas têm sua própria seção mais abaixo, pra não vazar titulo/descrição
  // antes da hora caso apareçam misturadas com missões obrigatórias comuns.
  if (event.missionMode === "MISSIONS") {
    const missions = await db.mission.findMany({
      where: { eventId: event.id, unlockAt: null },
      orderBy: { order: "asc" },
    });
    if (missions.length > 0) {
      const completions = await db.missionCompletion.findMany({
        where: { missionId: { in: missions.map((m) => m.id) }, email },
      });
      const completedIds = new Set(completions.map((c) => c.missionId));
      const pendingRequired = missions.filter((m) => m.required && !completedIds.has(m.id));

      if (pendingRequired.length > 0) {
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
            <MissionGate
              missions={missions.map((m) => ({
                id: m.id,
                type: m.type,
                title: m.title,
                description: m.description,
                required: m.required,
                linkUrl: m.linkUrl,
                quizOptions: m.quizOptions as string[] | null,
                completed: completedIds.has(m.id),
              }))}
            />
          </main>
        );
      }
    }
  }

  // Surpresa travada por data - independente do modo do evento (Simples ou
  // Com Missões), já que é aditiva: a pessoa já garantiu seu número
  // principal de qualquer jeito, isso é só uma oportunidade extra.
  // Só suporta uma surpresa ativa por evento por enquanto.
  const surpriseMission = await db.mission.findFirst({
    where: { eventId: event.id, unlockAt: { not: null } },
    orderBy: { order: "asc" },
  });
  let surpriseData: {
    id: string;
    unlockAt: string;
    unlocked: boolean;
    completed: boolean;
    bonusRaffleNumber: number | null;
    type?: "SELF_CHECK" | "QUIZ" | "PHOTO_UPLOAD" | "LINK_VISIT";
    title?: string | null;
    description?: string | null;
    linkUrl?: string | null;
    quizOptions?: string[] | null;
  } | null = null;

  if (surpriseMission) {
    const unlocked = surpriseMission.unlockAt!.getTime() <= Date.now();
    const completion = await db.missionCompletion.findUnique({
      where: { missionId_email: { missionId: surpriseMission.id, email } },
    });
    let bonusRaffleNumber: number | null = null;
    if (completion && surpriseMission.grantsExtraTicket) {
      const bonusParticipant = await db.participant.findFirst({
        where: { eventId: event.id, email, source: "MISSION" },
        orderBy: { createdAt: "desc" },
      });
      bonusRaffleNumber = bonusParticipant?.raffleNumber ?? null;
    }
    surpriseData = {
      id: surpriseMission.id,
      unlockAt: surpriseMission.unlockAt!.toISOString(),
      unlocked,
      completed: !!completion,
      bonusRaffleNumber,
      // Só entrega os detalhes reais se já desbloqueou - antes disso, o
      // participante não deve saber do que se trata, nem espiando o
      // conteúdo carregado na página.
      ...(unlocked
        ? {
            type: surpriseMission.type,
            title: surpriseMission.title,
            description: surpriseMission.description,
            linkUrl: surpriseMission.linkUrl,
            quizOptions: surpriseMission.quizOptions as string[] | null,
          }
        : {}),
    };
  }

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
          <h1>{event.name}</h1>
          {event.campaign && <span className="eyebrow">{event.campaign}</span>}
        </div>
      </section>

      <section className="numbers-section">
        {myNumbers.length === 1 ? (
          <div className="number-pill">
            Seu número é: <strong>{myNumbers[0]}</strong>
          </div>
        ) : (
          <details className="number-pill breakdown">
            <summary>
              Seus números ({myNumbers.length}): <strong>{myNumbers.join(" · ")}</strong>
            </summary>
            <ul>
              {myParticipants.map((p) => (
                <li key={p.id}>
                  <span className="ticket-name">{p.name}</span>
                  <span className="ticket-number">{p.raffleNumber}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
        {myNumbers.length > 1 && (
          <p className="odds-note">Quanto mais números, mais chances em cada sorteio.</p>
        )}
      </section>

      {surpriseData && <SurpriseSection mission={surpriseData} />}

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
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.55) 55%, var(--background, #0a1330) 92%);
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
          display: block;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-size: 0.7rem;
          color: var(--primary);
          margin-top: 0.4rem;
        }
        .hero h1 {
          font-family: "Sora", system-ui, sans-serif;
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          margin: 0;
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
        .number-pill.breakdown {
          border-radius: 1.25rem;
          text-align: left;
        }
        .number-pill.breakdown summary {
          cursor: pointer;
          list-style: none;
          text-align: center;
        }
        .number-pill.breakdown summary::-webkit-details-marker {
          display: none;
        }
        .number-pill.breakdown summary::after {
          content: " ▾ ver nomes";
          font-family: system-ui, sans-serif;
          color: var(--primary);
          font-weight: 600;
          font-size: 0.8rem;
        }
        .number-pill.breakdown[open] summary::after {
          content: " ▴ ocultar";
        }
        .number-pill.breakdown ul {
          list-style: none;
          margin: 0.75rem 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .number-pill.breakdown li {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 0.5rem;
          padding: 0.4rem 0.7rem;
          font-size: 0.85rem;
        }
        .ticket-name {
          opacity: 0.85;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ticket-number {
          font-family: monospace;
          color: var(--primary);
          font-weight: 600;
          flex-shrink: 0;
        }
        .odds-note {
          margin-top: 0.6rem;
          font-size: 0.8rem;
          opacity: 0.65;
        }
        .path-section {
          max-width: 60rem;
          margin: 0 auto;
          padding: 1rem 1.5rem 4rem;
        }
        h2 {
          font-size: 1rem;
          opacity: 0.75;
          font-weight: 500;
        }
        @media (min-width: 40rem) {
          h2 {
            font-size: 1.1rem;
            margin-bottom: 0.5rem;
          }
        }
        .empty {
          opacity: 0.6;
        }
      `}</style>
    </main>
  );
}
