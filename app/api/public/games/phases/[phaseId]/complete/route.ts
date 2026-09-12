import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { getSessionAdminId } from "@/lib/auth";
import { generateNumberPool } from "@/lib/raffle";
import {
  normalizeQuizQuestions,
  getRushConfig,
  speedMultiplier as computeSpeedMultiplier,
  normalizeReactionConfig,
  generateReactionSequence,
  evaluateReactionRounds,
  reactionSpeedMultiplier,
  normalizeMemoryConfig,
  evaluateMemoryRun,
  memorySpeedMultiplier,
  classifyMemoryTier,
  normalizeRunConfig,
  evaluateRunResult,
  normalizeTicketConfig,
  evaluateTicketRushResult,
} from "@/lib/games";
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

  // Cada tipo de jogo calcula "correctCount/total/percent/isPerfect" à sua
  // própria maneira, sempre no servidor - o que muda por tipo é só COMO
  // chega nesses números; o que vem depois (progresso, carta, número extra)
  // é o mesmo pra qualquer tipo.
  let correctCount: number;
  let total: number;
  let percent: number;
  let isPerfect: boolean;
  let speedFactor = 1; // multiplicador de pontuação por velocidade (1x a 1.5x), quando aplicável
  let extra: Record<string, unknown> = {};

  if (phase.type === "REACTION") {
    // Purple Reaction: N rodadas com alvo/decoy, tempo de reação medido no
    // cliente mas sempre clampado a uma janela humana plausível (ver
    // lib/games.ts::evaluateReactionRounds) - nunca gera número extra de
    // sorteio (ver mais abaixo), só XP/ranking, exatamente por depender de
    // um cronômetro que roda no navegador da pessoa.
    const config = normalizeReactionConfig(phase.content);
    // A sequência de quais rodadas são chamariz é recalculada aqui, nunca
    // lida do que o cliente mandou - ver lib/games.ts::generateReactionSequence.
    const expectedIsDecoy = generateReactionSequence(phase.id, config);
    const outcome = evaluateReactionRounds(body.rounds, config, expectedIsDecoy);
    correctCount = outcome.correctCount;
    total = outcome.total;
    percent = outcome.percent;
    isPerfect = outcome.isPerfect;
    speedFactor = isPerfect ? reactionSpeedMultiplier(outcome.avgMs) : 1;
    extra = { avgMs: outcome.avgMs, tier: outcome.tier };
  } else if (phase.type === "MEMORY") {
    // AS Memory: não tem "resposta certa" pra conferir (não existe segredo
    // nenhum sendo escondido do jogador, ver comentário em lib/games.ts) -
    // só `moves`/`elapsedMs` vêm do cliente, e `elapsedMs` é sempre clampado
    // a um mínimo humano plausível por par. Igual Reaction, nunca gera
    // número extra de sorteio (canGrantTicket mais abaixo), só XP/ranking.
    const config = normalizeMemoryConfig(phase.content);
    const outcome = evaluateMemoryRun(body.moves, body.elapsedMs, config);
    correctCount = outcome.pairs;
    total = outcome.pairs;
    percent = outcome.percent;
    isPerfect = outcome.isPerfect;
    speedFactor = isPerfect ? memorySpeedMultiplier(outcome.elapsedMs, outcome.pairs) : 1;
    extra = { moves: outcome.moves, tier: classifyMemoryTier(outcome.moves / outcome.pairs) };
  } else if (phase.type === "RUN") {
    // AS Run: corredor de 3 faixas, pontuação e combo calculados 100% no
    // navegador (não tem segredo servidor pra recalcular, ver comentário em
    // lib/games.ts) - o único cuidado possível é clampar a pontuação a um
    // teto fisicamente plausível dado o tempo decorrido. Igual Reaction e
    // Memory, nunca gera número extra de sorteio, só XP/ranking.
    const config = normalizeRunConfig(phase.content);
    const outcome = evaluateRunResult(body.score, body.maxCombo, body.elapsedMs, config);
    correctCount = outcome.score;
    total = config.targetScore;
    percent = outcome.percent;
    isPerfect = outcome.isPerfect;
    // Sem bônus de velocidade separado aqui - o desempenho já está todo
    // embutido na própria pontuação (combo cresce com sequência de acertos).
    speedFactor = 1;
    extra = { score: outcome.score, maxCombo: outcome.maxCombo, tier: outcome.tier };
  } else if (phase.type === "TICKET") {
    // Ticket Rush: itens caindo, toca só nos válidos - pontuação e combo
    // calculados 100% no navegador, igual AS Run (mesmo comentário se
    // aplica, ver lib/games.ts). Nunca gera número extra de sorteio, só
    // XP/ranking.
    const config = normalizeTicketConfig(phase.content);
    const outcome = evaluateTicketRushResult(body.score, body.maxCombo, body.elapsedMs, config);
    correctCount = outcome.score;
    total = config.targetScore;
    percent = outcome.percent;
    isPerfect = outcome.isPerfect;
    speedFactor = 1;
    extra = { score: outcome.score, maxCombo: outcome.maxCombo, tier: outcome.tier };
  } else {
    // QUIZ (e qualquer fase antiga sem type explícito, que sempre foi quiz).
    const answers: unknown[] = Array.isArray(body.answers) ? body.answers : [];
    const questions = normalizeQuizQuestions(phase.content);
    if (questions.length === 0) {
      return NextResponse.json({ error: "Essa fase não tem perguntas configuradas." }, { status: 400 });
    }
    // Pontuação sempre calculada no servidor, nunca confiando num placar que
    // o navegador mande - o cliente só manda o índice escolhido em cada
    // pergunta, igual já acontece em missions/[id]/complete.
    correctCount = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correctCount++;
    });
    total = questions.length;
    percent = Math.round((correctCount / total) * 100);
    isPerfect = percent === 100;

    // Modo Rush (11/09): bônus de pontuação por velocidade, só quando a fase
    // foi 100% acertada - o `elapsedMs` vem do cliente mas é sempre clampado
    // dentro do limite de tempo da fase (ver lib/games.ts::speedMultiplier),
    // então o pior caso de manipulação é "ganhar o bônus máximo", nunca mais
    // que isso, e nunca afeta se a fase foi perfeita ou não (isso continua
    // 100% calculado aqui em cima das respostas reais).
    const rush = getRushConfig(phase.game.theme);
    const rawElapsedMs = typeof body.elapsedMs === "number" ? body.elapsedMs : null;
    speedFactor = rush.enabled && isPerfect ? computeSpeedMultiplier(rawElapsedMs, rush.timeLimitSeconds) : 1;
    extra = { rushEnabled: rush.enabled };
  }

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

  // Número extra de sorteio só pra tipos com pontuação 100% verificável no
  // servidor (hoje só QUIZ, incluindo o Modo Rush - a velocidade é só um
  // bônus de pontos, o "acertou tudo" continua vindo das respostas reais).
  // Tipos como REACTION dependem de um cronômetro que roda no navegador da
  // pessoa - valem XP/ranking normalmente, mas nunca número de sorteio,
  // pra não abrir brecha nessa parte que envolve prêmio de verdade.
  const canGrantTicket = phase.type === "QUIZ";

  if (isFirstAttempt && isPerfect && phase.grantsExtraTicket && canGrantTicket) {
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
    total,
    percent,
    isPerfect,
    alreadyPlayed: !isFirstAttempt,
    cardWon,
    extraTicketNumber,
    // speedFactor só passa de 1 quando teve bônus de verdade (Rush ligado, ou
    // Reaction), então isso já cobre os dois tipos sem precisar saber qual é.
    speedMultiplier: speedFactor > 1 ? Math.round(speedFactor * 100) / 100 : null,
    ...extra,
  });
}