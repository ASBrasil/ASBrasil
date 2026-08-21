import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { generateNumberPool } from "@/lib/raffle";
import { ParticipantSource } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const mission = await db.mission.findUnique({ where: { id: params.id } });
  if (!mission) return NextResponse.json({ error: "Missão não encontrada" }, { status: 404 });

  if (mission.unlockAt && mission.unlockAt.getTime() > Date.now()) {
    return NextResponse.json({ error: "Essa missão ainda não foi liberada." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  const data: {
    missionId: string;
    email: string;
    photoUrl?: string | null;
    quizAnswer?: number | null;
    quizCorrect?: boolean | null;
  } = { missionId: mission.id, email };

  if (mission.type === "PHOTO_UPLOAD") {
    if (!body.photoUrl) {
      return NextResponse.json({ error: "Envie uma foto para concluir essa missão." }, { status: 400 });
    }
    data.photoUrl = body.photoUrl;
  }

  if (mission.type === "QUIZ") {
    if (typeof body.answerIndex !== "number") {
      return NextResponse.json({ error: "Escolha uma resposta." }, { status: 400 });
    }
    data.quizAnswer = body.answerIndex;
    data.quizCorrect = body.answerIndex === mission.quizCorrectIndex;
    if (!data.quizCorrect) {
      // Não grava conclusão em resposta errada - a pessoa pode tentar de
      // novo. Devolve o resultado sem criar o registro de conclusão.
      return NextResponse.json({ correct: false });
    }
  }

  // SELF_CHECK e LINK_VISIT não têm dado extra - é só a confirmação em si.

  // A missão só pode ser completada uma vez por e-mail (constraint única
  // missionId+email) - se já existia uma conclusão, não gera outro número
  // extra por engano, mesmo que o participante chame essa rota de novo.
  const alreadyCompleted = await db.missionCompletion.findUnique({
    where: { missionId_email: { missionId: mission.id, email } },
  });

  const completion = await db.missionCompletion.upsert({
    where: { missionId_email: { missionId: mission.id, email } },
    create: data,
    update: data,
  });

  let bonusRaffleNumber: number | null = null;

  if (mission.grantsExtraTicket && !alreadyCompleted) {
    // Copia nome/telefone de um registro já existente dessa pessoa nesse
    // evento (ela só chegou até aqui porque já tem pelo menos um ingresso
    // - Participant.name é obrigatório, não dá pra criar sem isso).
    const base = await db.participant.findFirst({
      where: { eventId: mission.eventId, email },
      orderBy: { createdAt: "asc" },
    });
    if (base) {
      const [newNumber] = generateNumberPool(1);
      const bonus = await db.participant.create({
        data: {
          eventId: mission.eventId,
          name: base.name,
          email,
          phone: base.phone,
          raffleNumber: newNumber,
          source: ParticipantSource.MISSION,
        },
      });
      bonusRaffleNumber = bonus.raffleNumber;
    }
  }

  return NextResponse.json({ completion, correct: true, bonusRaffleNumber });
}
