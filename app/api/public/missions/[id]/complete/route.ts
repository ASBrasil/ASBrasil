import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const email = await getParticipantEmail();
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const mission = await db.mission.findUnique({ where: { id: params.id } });
  if (!mission) return NextResponse.json({ error: "Missão não encontrada" }, { status: 404 });

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

  const completion = await db.missionCompletion.upsert({
    where: { missionId_email: { missionId: mission.id, email } },
    create: data,
    update: data,
  });

  return NextResponse.json({ completion, correct: true });
}
