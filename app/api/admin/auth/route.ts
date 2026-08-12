import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSession, clearSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const admin = await db.adminUser.findUnique({ where: { email } });
  // Constant-shape response whether the email exists or not, to avoid
  // leaking which admin emails are valid.
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  await createSession(admin.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  clearSession();
  return NextResponse.json({ ok: true });
}
