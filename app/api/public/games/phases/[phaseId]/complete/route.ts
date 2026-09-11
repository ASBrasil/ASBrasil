import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { getSessionAdminId } from "@/lib/auth";
import { generateNumberPool } from "@/lib/raffle";
import { normalizeQuizQuestions, getRushConfig, speedMultiplier as computeSpeedMultiplier } from "@/lib/games";
import { grantGamePerfectCards } from "@/lib/cards";
import { ParticipantSource } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: { phaseId: string } }) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const phase = await db.gamePhase.findUnique({
    where: { id: params.phaseId },
    include: { game: true, rewardCard: true },
  });
  if (!phase) return NextResponse.json({ error: "Fase não encontrada" }, { status: 404 });

  const adminId = await getSessionAdminId();
  // DRAFT e TESTING (jogo ainda não anunciado) só pra quem está na lista de
  // testadores ou é admin - LIVE é o único aberto pra qualquer participante.
  if ((phase.game.visibility === "DRAFT" || phase.game.visibility === "TESTING") && !adminId) {
    const isTester = await db.gameTester.findUnique({ where: { email } });
    if (!isTester) {
      return NextResponse.json({ error: "Esse jogo ainda não está disponível pra você." }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const answers: unknown[] = Array.isArray(body.answers) ? body.answers : [];

  const questions = normalizeQuizQuestions(phase.content);
  if (questions.length === 0) {
    return NextResponse.json({ error: "Essa fase não tem perguntas configuradas." }, { status: 400 });
  }

  // Pontuação sempre calculada no servidor, nunca confiando num placar que
  // o navegador mande - o cliente só manda o índice escolhido em cada
  // pergunta, igual já acontece em missions/[id]/complete.
  let correctCount = 0;
  questions.forEach((q, i) => {
    if (answers[i] === q.correctIndex) correctCount++;
  });
  const percent = Math.round((correctCount / questions.length) * 100);
  const isPerfect = percent === 100;

  // Modo Rush (11/09): bônus de pontuação por velocidade, só quando a fase
  // foi 100% acertada - o `elapsedMs` vem do cliente mas é sempre clampado
  // dentro do limite de tempo da fase (ver lib/games.ts::speedMultiplier),
  // então o pior caso de manipulação é "ganhar o bônus máximo", nunca mais
  // que isso, e nunca afeta se a fase foi perfeita ou não (isso continua
  // 100% calculado aqui em cima das respostas reais).
  const rush = getRushConfig(phase.game.theme);
  const rawElapsedMs = typeof body.elapsedMs === "number" ? body.elapsedMs : null;
  const speedFactor = rush.enabled && isPerfect ? computeSpeedMultiplier(rawElapsedMs, rush.timeLimitSeconds) : 1;

  // Garante que existe um perfil Universo AS pra essa pessoa antes de
  // gravar qualquer progresso/carta - chave é o e-mail, sem cadastro novo;
  // puxa o nome de alguma inscrição já existente, se tiver.
  const existingProfile = await db.universeProfile.findUnique({ where: { email } });
  if (!existingProfile) {
    const anyParticipant = await db.participant.findFirst({
      where: { email },
      orderBy: { createdAt: "asc" },
    });
    await db.universeProfile.create({ data: { email, displayName: anyParticipant?.name ?? null } });
  }

  const existingProgress = await db.playerPhaseProgress.findUnique({
    where: { email_phaseId: { email, phaseId: phase.id } },
  });

  // Só a primeira tentativa pontua/concede recompensa - igual já acontece
  // em Mission/MissionCompletion. Jogar de novo depois mostra o resultado
  // de novo, mas não gera outro número extra nem duplica a carta.
  const isFirstAttempt = !existingProgress;

  await db.playerPhaseProgress.upsert({
    where: { email_phaseId: { email, phaseId: phase.id } },
    create: {
      email,
      phaseId: phase.id,
      completed: true,
      firstScore: isPerfect ? Math.round(phase.points * speedFactor) : Math.round((phase.points * percent) / 100),
      attempts: 1,
    },
    update: { attempts: { increment: 1 } },
  });

  let cardWon: { id: string; name: string; rarity: string; imageUrl: string | null } | null = null;
  let extraTicketNumber: number | null = null;

  if (isPerfect && phase.rewardCard) {
    cardWon = {
      id: phase.rewardCard.id,
      name: phase.rewardCard.name,
      rarity: phase.rewardCard.rarity,
      imageUrl: phase.rewardCard.imageUrl,
    };
    if (isFirstAttempt) {
      await db.playerCard.upsert({
        where: { email_cardId: { email, cardId: phase.rewardCard.id } },
        create: { email, cardId: phase.rewardCard.id },
        update: {},
      });
    }
  }

  if (isFirstAttempt && isPerfect && phase.grantsExtraTicket) {
    // Só concede o número extra se a pessoa já for Participant desse
    // evento específico - o álbum/XP são livres pra todo mundo do
    // Universo AS, mas o brinde do sorteio exige inscrição de verdade.
    const base = await db.participant.findFirst({
      where: { eventId: phase.game.eventId, email },
      orderBy: { createdAt: "asc" },
    });
    if (base) {
      const [newNumber] = generateNumberPool(1);
      const bonus = await db.participant.create({
        data: {
          eventId: phase.game.eventId,
          name: base.name,
          email,
          phone: base.phone,
          raffleNumber: newNumber,
          source: ParticipantSource.GAME,
          moderationStatus: "APPROVED",
          gamePhaseId: phase.id,
        },
      });
      extraTicketNumber = bonus.raffleNumber;
    }
  }

  // Figurinha automática de "100% do jogo" - checa TODAS as fases do jogo
  // toda vez que uma é concluída (idempotente, e barato quando o jogo não
  // tem nenhuma carta configurada pra esse gatilho - ver lib/cards.ts).
  await grantGamePerfectCards(phase.game.id, email).catch((err) =>
    console.error("Falha ao conceder figurinha de 100% do jogo:", err)
  );

  return NextResponse.json({
    correctCount,
    total: questions.length,
    percent,
    isPerfect,
    alreadyPlayed: !isFirstAttempt,
    cardWon,
    extraTicketNumber,
    speedMultiplier: rush.enabled ? Math.round(speedFactor * 100) / 100 : null,
  });
}