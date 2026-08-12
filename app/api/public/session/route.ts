import { NextResponse } from "next/server";
import { clearParticipantSession } from "@/lib/participant-session";

export async function DELETE() {
  clearParticipantSession();
  return NextResponse.json({ ok: true });
}
