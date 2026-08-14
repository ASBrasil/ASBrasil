import { NextRequest, NextResponse } from "next/server";
import { clearParticipantSession } from "@/lib/participant-session";

/**
 * The logout button is a plain HTML <form method="post"> submission (full
 * page navigation), not a fetch call - so this has to respond with an
 * actual redirect.
 *
 * Only POST here, deliberately: HTML forms only support "get" and "post"
 * as real method values. A previous version relied on `formMethod="delete"`
 * on the button, but that's not a value browsers recognize - they silently
 * fall back to GET, which this route never handled, leaving the user
 * stranded on /api/public/session with nothing happening. POST is the one
 * that actually reaches the server.
 */
export async function POST(req: NextRequest) {
  clearParticipantSession();
  return NextResponse.redirect(new URL("/entrar", req.url), { status: 303 });
}
