import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

/**
 * Separate from /api/admin/auth on purpose: that route's POST is already
 * taken by login (JSON body via fetch from the login page). The logout
 * button is a plain HTML form submission instead (needs an actual
 * redirect, not JSON), and HTML forms only support "get"/"post" as real
 * method values - so this gets its own POST-only route rather than
 * trying to overload /api/admin/auth's POST or relying on a DELETE that
 * a <form> can never actually send.
 */
export async function POST(req: NextRequest) {
  clearSession();
  return NextResponse.redirect(new URL("/admin/login", req.url), { status: 303 });
}
