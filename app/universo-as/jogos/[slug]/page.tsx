import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { getSessionAdminId } from "@/lib/auth";
import { normalizeQuizQuestions, stripCorrectAnswers } from "@/lib/games";
import { GamePlayer } from "@/components/participant/GamePlayer";
import { ParticipantTopNav } from "@/components/participant/ParticipantTopNav";

export const dynamic = "force-dynamic";

export default async function PlayGamePage({ params }: { params: { slug: string } }) {
  const email = await getParticipantEmail();
  const adminId = await getSessionAdminId();
  if (!email && !adminId) redirect("/entrar");

  const game = await db.game.findUnique({
    where: { slug: params.slug },
    include: {
      event: { select: { id: true, name: true } },
      phases: { orderBy: { order: "asc" } },
    },
  });
  if (!game) notFound();

  const isTester = email ? await db.gameTester.findUnique({ where: { email } }) : null;
  // LIVE é aberto pra todo mundo; TESTING e DRAFT só pra quem está na lista
  // de testadores ou é admin.
  const allowed =
    game.visibility === "LIVE" ||
    !!adminId ||
    ((game.visibility === "TESTING" || game.visibility === "DRAFT") && !!isTester);
  // Jogo em DRAFT/TESTING pra quem não pode ver: trata como se não
  // existisse, em vez de mostrar um "sem permissão" que entrega que ali
  // tem algo escondido.
  if (!allowed) notFound();

  const phaseIds = game.phases.map((p: { id: string }) => p.id);
  const [progressRows, isEventParticipant] = await Promise.all([
    email && phaseIds.length
      ? db.playerPhaseProgress.findMany({ where: { email, phaseId: { in: phaseIds } } })
      : Promise.resolve([]),
    email
      ? db.participant.findFirst({ where: { eventId: game.eventId, email } }).then((p: unknown) => !!p)
      : Promise.resolve(false),
  ]);
  const progressByPhase = new Map(
    progressRows.map((p: { phaseId: string; completed: boolean; firstScore: number; attempts: number }) => [
      p.phaseId,
      p,
    ])
  );

  const phases = game.phases.map((p: any) => {
    const existing = progressByPhase.get(p.id) as
      | { completed: boolean; firstScore: number; attempts: number }
      | undefined;
    return {
      id: p.id,
      order: p.order,
      title: p.title,
      points: p.points,
      grantsExtraTicket: p.grantsExtraTicket,
      hasRewardCard: !!p.rewardCardId,
      questions: stripCorrectAnswers(normalizeQuizQuestions(p.content)),
      result: existing
        ? { completed: existing.completed, firstScore: existing.firstScore, attempts: existing.attempts }
        : null,
    };
  });

  return (
    <>
      <ParticipantTopNav eventName={game.event.name} />
      <GamePlayer
        game={{
          id: game.id,
          name: game.name,
          eventName: game.event.name,
          theme: game.theme as any,
        }}
        phases={phases}
        isEventParticipant={isEventParticipant}
      />
    </>
  );
}
