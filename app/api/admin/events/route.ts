import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  const events = await db.event.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { participants: true, prizes: true } },
    },
  });
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();

  const { name, campaign, slug, description, startAt, endAt } = body;
  if (!name || !slug) {
    return NextResponse.json({ error: "name e slug são obrigatórios" }, { status: 400 });
  }

  const slugTaken = await db.event.findUnique({ where: { slug } });
  if (slugTaken) {
    return NextResponse.json({ error: "Esse slug já está em uso" }, { status: 409 });
  }

  const event = await db.event.create({
    data: {
      name,
      campaign,
      slug,
      description,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      theme: {
        colors: { primary: "#E8B646", background: "#12121A", surface: "#1B1B26", text: "#F5F0E6" },
      },
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
