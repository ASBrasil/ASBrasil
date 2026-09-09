import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const VALID_VISIBILITY = ["DRAFT", "TESTING", "LIVE"];
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Nome não pode ficar em branco." }, { status: 400 });
    }
    data.name = body.name.trim();
  }
  if (body.slug !== undefined) {
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json(
        { error: "Slug inválido - só letras minúsculas, números e hífen." },
        { status: 400 }
      );
    }
    data.slug = slug;
  }
  if (body.theme !== undefined) data.theme = body.theme;
  if (body.visibility !== undefined) {
    if (!VALID_VISIBILITY.includes(body.visibility)) {
      return NextResponse.json(
        { error: `visibility deve ser um de: ${VALID_VISIBILITY.join(", ")}` },
        { status: 400 }
      );
    }
    data.visibility = body.visibility;
  }

  try {
    const game = await db.game.update({ where: { id: params.id }, data });
    return NextResponse.json({ game });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Já existe um jogo com esse slug." }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  await db.game.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}