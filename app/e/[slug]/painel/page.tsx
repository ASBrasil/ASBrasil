import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { ParticipantTopNav } from "@/components/participant/ParticipantTopNav";
import { PrizePath, PathStep } from "@/components/participant/PrizePath";
import { MissionGate } from "@/components/participant/MissionGate";
import { MissionOpportunities } from "@/components/participant/MissionOpportunities";
import { ResponsiveBanner } from "@/components/ResponsiveBanner";
import { LpBlocksSection } from "@/components/LpBlocksSection";
import { PresenceHeartbeat } from "@/components/participant/PresenceHeartbeat";

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
  const bannerUrlMobile = theme?.bannerUrlMobile as string | undefined;

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
            "--surface": colors.surface ?? "#141B3D",
            background: colors.background ?? "#0A1330",
            color: colors.text ?? "#F5F6FA",
            minHeight: "100vh",
            fontFamily: "system-ui, sans-serif",
          } as React.CSSProperties
        }
      >
        <PresenceHeartbeat eventId={event.id} />
      <ParticipantTopNav eventName={event.name} />

        <section className={`hero ${bannerUrl ? "has-banner" : ""}`}>
          {bannerUrl && (
            <>
              <ResponsiveBanner desktopUrl={bannerUrl} mobileUrl={bannerUrlMobile} className="hero-bg" />
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
          <div className="prerequisite-actions">
            {event.publicSignupEnabled && (
              <a href={`/e/${event.slug}/inscrever`} className="cta-btn primary">
                🎟️ Inscrever-se agora
              </a>
            )}
            <a
              href="https://app.asbrasil.tur.br/"
              target="_blank"
              rel="noopener noreferrer"
              className={`cta-btn ${event.publicSignupEnabled ? "secondary" : ""}`}
            >
              Minhas reservas ↗
            </a>
          </div>
        </section>

        <LpBlocksSection blocks={event.lpBlocks} />

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
          .prerequisite-actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.75rem;
          }
          .cta-btn {
            display: inline-block;
            background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 100%, black 28%));
            color: #12121a;
            font-weight: 700;
            text-decoration: none;
            padding: 0.7rem 1.5rem;
            border-radius: 999px;
            font-size: 0.9rem;
            transition: opacity 0.2s, background 0.2s, color 0.2s;
          }
          .cta-btn:hover {
            opacity: 0.85;
          }
          .cta-btn.secondary {
            background: transparent;
            color: #fff;
            opacity: 0.85;
            border: 1px solid rgba(255, 255, 255, 0.25);
          }
          .cta-btn.secondary:hover {
            opacity: 1;
            border-color: rgba(255, 255, 255, 0.45);
          }
        `}</style>
      </main>
    );
  }

  const myParticipantIds = new Set(myParticipants.map((p) => p.id));

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
                "--surface": colors.surface ?? "#141B3D",
                background: colors.background ?? "#0A1330",
                color: colors.text ?? "#F5F6FA",
                minHeight: "100vh",
                fontFamily: "system-ui, sans-serif",
              } as React.CSSProperties
            }
          >
            <PresenceHeartbeat eventId={event.id} />
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

  // Missões de escolha (grantsExtraTicket): tanto pra revelar o primeiro
  // número (quem ainda está com awaitingPrerequisite) quanto pra ganhar
  // números extras (quem já tem pelo menos um número visível). Busca
  // TODAS de uma vez, trava/destrava e completude decididas por item.
  const choiceMissions = await db.mission.findMany({
    where: { eventId: event.id, grantsExtraTicket: true },
    orderBy: { order: "asc" },
  });
  const choiceCompletions =
    choiceMissions.length > 0
      ? await db.missionCompletion.findMany({
          where: { missionId: { in: choiceMissions.map((m) => m.id) }, email },
        })
      : [];
  const completedChoiceIds = new Set(choiceCompletions.map((c) => c.missionId));

  function toOpportunity(m: (typeof choiceMissions)[number]) {
    const unlocked = !m.unlockAt || m.unlockAt.getTime() <= Date.now();
    return {
      id: m.id,
      unlockAt: m.unlockAt ? m.unlockAt.toISOString() : null,
      unlocked,
      // Só entrega os detalhes reais se já desbloqueou - antes disso, o
      // participante não deve saber do que se trata.
      ...(unlocked
        ? {
            type: m.type,
            title: m.title,
            description: m.description,
            linkUrl: m.linkUrl,
            quizOptions: m.quizOptions as string[] | null,
          }
        : {}),
    };
  }

  const pendingChoiceMissions = choiceMissions
    .filter((m) => !completedChoiceIds.has(m.id))
    .map(toOpportunity);

  // Se ela ainda não escolheu/completou nenhum pré-requisito, o número
  // base nasceu escondido no cadastro (awaitingPrerequisite) - mostra a
  // tela de escolha em vez dos números normais.
  const stillAwaiting = myParticipants.some((p) => p.awaitingPrerequisite);
  const visibleParticipants = myParticipants.filter((p) => !p.awaitingPrerequisite);

  if (stillAwaiting && visibleParticipants.length === 0) {
    return (
      <main
        style={
          {
            "--primary": colors.primary ?? "#4F5FFF",
            "--background": colors.background ?? "#0A1330",
            "--surface": colors.surface ?? "#141B3D",
            background: colors.background ?? "#0A1330",
            color: colors.text ?? "#F5F6FA",
            minHeight: "100vh",
            fontFamily: "system-ui, sans-serif",
          } as React.CSSProperties
        }
      >
        <PresenceHeartbeat eventId={event.id} />
      <ParticipantTopNav eventName={event.name} />
        <section className={`hero ${bannerUrl ? "has-banner" : ""}`}>
          {bannerUrl && (
            <>
              <ResponsiveBanner desktopUrl={bannerUrl} mobileUrl={bannerUrlMobile} className="hero-bg" />
              <div className="hero-scrim" />
            </>
          )}
          <div className="hero-content">
            <h1>{event.name}</h1>
            {event.campaign && <span className="eyebrow">{event.campaign}</span>}
          </div>
        </section>
        <MissionOpportunities missions={pendingChoiceMissions} mode="first" />
        <LpBlocksSection blocks={event.lpBlocks} />
        <style>{`
          .hero {
            position: relative;
            padding: 3rem 1.5rem 1.5rem;
            text-align: center;
            overflow: hidden;
          }
          .hero.has-banner { padding-top: 8rem; padding-bottom: 3rem; }
          .hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
          .hero-scrim {
            position: absolute; inset: 0;
            background: linear-gradient(to bottom, rgba(0,0,0,0.3), var(--background, #0A1330) 92%);
            z-index: 1;
          }
          .hero-content { position: relative; z-index: 2; }
          .hero h1 { margin: 0 0 0.4rem; font-family: "Sora", system-ui, sans-serif; font-size: clamp(1.5rem, 4vw, 2rem); }
          .eyebrow { font-size: 0.78rem; opacity: 0.7; }
        `}</style>
      </main>
    );
  }

  const myNumbers = visibleParticipants.map((p) => p.raffleNumber);

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

  // Registro de acesso a esse evento especifico, pro dashboard de Acessos
  // conseguir mostrar quem entrou em qual sorteio - fire-and-forget, uma
  // falha aqui nunca pode quebrar a pagina de quem so quer ver o numero.
  db.loginEvent
    .create({ data: { email, eventId: event.id, eventName: event.name } })
    .catch((err) => console.error("Falha ao registrar acesso ao evento:", err));

  return (
    <main
      style={
        {
          "--primary": colors.primary ?? "#4F5FFF",
          "--background": colors.background ?? "#0A1330",
          "--surface": colors.surface ?? "#141B3D",
          background: colors.background ?? "#0A1330",
          color: colors.text ?? "#F5F6FA",
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
        } as React.CSSProperties
      }
    >
      <PresenceHeartbeat eventId={event.id} />
      <ParticipantTopNav eventName={event.name} />

      <section className={`hero ${bannerUrl ? "has-banner" : ""}`}>
        {bannerUrl && (
          <>
            <ResponsiveBanner desktopUrl={bannerUrl} mobileUrl={bannerUrlMobile} className="hero-bg" />
            <div className="hero-scrim" />
          </>
        )}
        <div className="hero-content">
          <h1>{event.name}</h1>
          {event.campaign && <span className="eyebrow">{event.campaign}</span>}
        </div>
      </section>

      <section className="numbers-section">
        {visibleParticipants.some((p) => p.moderationStatus === "PENDING") && (
          <p className="moderation-note pending">
            ⏳ Sua participação está em análise. Seu número aparece abaixo, mas só entra no
            sorteio depois que a equipe confirmar seu comprovante.
          </p>
        )}
        {visibleParticipants.some((p) => p.moderationStatus === "REJECTED") && (
          <p className="moderation-note rejected">
            ❌ Sua participação não foi aprovada. Esse número não entra no sorteio até que a
            situação seja corrigida — entre em contato com a organização.
          </p>
        )}
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
              {visibleParticipants.map((p) => (
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

      <MissionOpportunities missions={pendingChoiceMissions} mode="bonus" />

      <section className="path-section">
        <div className="section-heading">
          <span className="eyebrow">Acompanhe</span>
          <h2>Seus sorteios</h2>
        </div>
        {steps.length === 0 ? (
          <p className="empty">Nenhum prêmio cadastrado ainda.</p>
        ) : (
          <PrizePath slug={event.slug} steps={steps} />
        )}
      </section>

      <LpBlocksSection blocks={event.lpBlocks} />

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
          padding: 2.5rem 1.5rem 0.75rem;
          text-align: center;
        }
        .moderation-note {
          max-width: 32rem;
          margin: 0 auto 1rem;
          padding: 0.75rem 1.1rem;
          border-radius: 0.75rem;
          font-size: 0.85rem;
          line-height: 1.6;
          text-align: left;
        }
        .moderation-note.pending {
          background: rgba(180, 83, 9, 0.12);
          border: 1px solid rgba(180, 83, 9, 0.35);
        }
        .moderation-note.rejected {
          background: rgba(192, 57, 43, 0.12);
          border: 1px solid rgba(192, 57, 43, 0.35);
        }
        .number-pill {
          display: inline-block;
          max-width: 32rem;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1.5rem;
          padding: 0.75rem 1.6rem;
          font-size: 0.92rem;
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
          padding: 1.5rem 1.5rem 4.5rem;
        }
        .section-heading {
          margin-bottom: 1.5rem;
        }
        .section-heading .eyebrow {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: var(--primary);
          margin-bottom: 0.4rem;
        }
        h2 {
          font-family: "Sora", system-ui, sans-serif;
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0;
          opacity: 1;
        }
        .empty {
          opacity: 0.6;
        }
      `}</style>
    </main>
  );
}
