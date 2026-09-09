import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  const experiences = await db.experience.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { events: true } } },
  });
  return NextResponse.json({ experiences });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();

  const { name, slug, subtitle, description } = body;
  if (!name || !slug) {
    return NextResponse.json({ error: "name e slug são obrigatórios" }, { status: 400 });
  }

  const slugTaken = await db.experience.findUnique({ where: { slug } });
  if (slugTaken) {
    return NextResponse.json({ error: "Esse slug já está em uso" }, { status: 409 });
  }

  const last = await db.experience.findFirst({ orderBy: { order: "desc" }, select: { order: true } });

  const experience = await db.experience.create({
    data: {
      name,
      slug,
      subtitle: subtitle || null,
      description: description || null,
      order: (last?.order ?? -1) + 1,
      theme: { primaryColor: "#3B55E6", secondaryColor: "#0c2a5b", backgroundImageUrl: null },
    },
  });

  return NextResponse.json({ experience }, { status: 201 });
}
