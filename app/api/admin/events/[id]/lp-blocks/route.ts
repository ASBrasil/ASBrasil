import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const event = await db.event.findUnique({ where: { id: params.id }, select: { lpBlocks: true } });
  return NextResponse.json({ blocks: event?.lpBlocks ?? [] });
}

/**
 * Salva o array inteiro de blocos de uma vez - mais simples que CRUD
 * granular por bloco, já que o admin edita tudo numa tela só e clica em
 * "Salvar" no final.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json();
  if (!Array.isArray(body.blocks)) {
    return NextResponse.json({ error: "blocks deve ser um array" }, { status: 400 });
  }
  await db.event.update({ where: { id: params.id }, data: { lpBlocks: body.blocks } });
  return NextResponse.json({ ok: true });
}
