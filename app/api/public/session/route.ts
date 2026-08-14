import { NextRequest, NextResponse } from "next/server";
import { clearParticipantSession } from "@/lib/participant-session";

/**
 * The logout button is a plain HTML <form method="post" formMethod="delete">
 * submission (full page navigation), not a fetch call - so this has to
 * respond with an actual redirect. Returning JSON here (as it did before)
 * just left the browser sitting on /api/public/session showing raw
 * {"ok":true} text instead of going anywhere.
 */
export async function DELETE(req: NextRequest) {
  clearParticipantSession();
  return NextResponse.redirect(new URL("/entrar", req.url), { status: 303 });
}
