import { NextRequest, NextResponse } from "next/server";
import { getParticipantEmail } from "@/lib/participant-session";
import { unlockCharacterWithCoins } from "@/lib/characters";

/**
 * Loja de Personagens do Universo AS (01/10) - desbloqueia um personagem
 * gastando a moeda da loja (ver CoinEntry em prisma/schema.prisma). Exige
 * e-mail identificado (mesma regra dos outros progressos do arcade) porque
 * a moeda só existe presa a um e-mail - jogar anônimo continua funcionando
 * pros personagens iniciais, só não dá pra comprar.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const email = await getParticipantEmail();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Entre com seu e-mail do Universo AS pra comprar personagens." }, { status: 401 });
  }

  const result = await unlockCharacterWithCoins(email, params.id);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
