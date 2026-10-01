import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isUniverseEngine } from "@/lib/arcade";

const VALID_VISIBILITY = ["DRAFT", "TESTING", "LIVE"];
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Título não pode ficar em branco." }, { status: 400 });
    }
    data.title = body.title.trim();
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
  if (body.engine !== undefined) {
    if (!isUniverseEngine(body.engine)) {
      return NextResponse.json({ error: "engine inválido" }, { status: 400 });
    }
    data.engine = body.engine;
  }
  if (body.experienceId !== undefined) {
    const experience = await db.experience.findUnique({ where: { id: body.experienceId } });
    if (!experience) return NextResponse.json({ error: "Experiência não encontrada" }, { status: 404 });
    data.experienceId = body.experienceId;
  }
  if (body.description !== undefined) data.description = body.description ?? "";
  if (body.tag !== undefined) data.tag = body.tag ?? "";
  if (body.coverImageUrl !== undefined) data.coverImageUrl = body.coverImageUrl || null;
  if (body.order !== undefined && Number.isFinite(body.order)) data.order = body.order;
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
    const game = await db.universeGame.update({ where: { id: params.id }, data });
    return NextResponse.json({ game });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Já existe um jogo do Universo AS com esse slug." }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  await db.universeGame.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
