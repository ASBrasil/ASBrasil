import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { getSessionAdminId } from "@/lib/auth";
import {
  normalizeQuizQuestions,
  stripCorrectAnswers,
  getRushConfig,
  normalizeReactionConfig,
  normalizeMemoryConfig,
  normalizeRunConfig,
  normalizeTicketConfig,
  normalizePerfectPickConfig,
  normalizeWorldConfig,
  normalizeMazeConfig,
  normalizeBlastConfig,
  normalizeCityRunConfig,
} from "@/lib/games";
import { GamePlayer } from "@/components/participant/GamePlayer";
import { ParticipantTopNav } from "@/components/participant/ParticipantTopNav";

export const dynamic = "force-dynamic";

// Tipos cuja pontuação vem 100% do navegador (canvas/cronômetro), sem
// segredo nenhum guardado no servidor pra esconder do participante - ver
// comentário completo em lib/games.ts e complete/route.ts.
const NO_SECRET_TYPES = new Set(["REACTION", "MEMORY", "RUN", "TICKET", "PICK", "WORLD", "MAZE", "BLAST", "CITYRUN"]);

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
      type: p.type,
      points: p.points,
      grantsExtraTicket: p.grantsExtraTicket,
      hasRewardCard: !!p.rewardCardId,
      hasRewardCharacter: !!p.rewardCharacterId,
      // Reaction, Memory, Run, Ticket, Pick e os 4 do AS Game Universe não
      // têm "resposta certa" pra esconder (nenhum deles depende de um
      // segredo guardado no servidor) - só o quiz precisa tirar a
      // correctIndex antes de mandar pro cliente.
      questions: NO_SECRET_TYPES.has(p.type) ? [] : stripCorrectAnswers(normalizeQuizQuestions(p.content)),
      reactionConfig: p.type === "REACTION" ? normalizeReactionConfig(p.content) : null,
      memoryConfig: p.type === "MEMORY" ? normalizeMemoryConfig(p.content) : null,
      runConfig: p.type === "RUN" ? normalizeRunConfig(p.content) : null,
      ticketConfig: p.type === "TICKET" ? normalizeTicketConfig(p.content) : null,
      pickConfig: p.type === "PICK" ? normalizePerfectPickConfig(p.content) : null,
      worldConfig: p.type === "WORLD" ? normalizeWorldConfig(p.content) : null,
      mazeConfig: p.type === "MAZE" ? normalizeMazeConfig(p.content) : null,
      blastConfig: p.type === "BLAST" ? normalizeBlastConfig(p.content) : null,
      cityRunConfig: p.type === "CITYRUN" ? normalizeCityRunConfig(p.content) : null,
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
          rush: getRushConfig(game.theme),
        }}
        phases={phases}
        isEventParticipant={isEventParticipant}
      />
    </>
  );
}
