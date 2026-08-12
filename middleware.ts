import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export async function middleware(req: NextRequest) {
  const isAdminRoute =
    req.nextUrl.pathname.startsWith("/admin") &&
    !req.nextUrl.pathname.startsWith("/admin/login");

  const isAdminApi =
    req.nextUrl.pathname.startsWith("/api/admin") &&
    req.nextUrl.pathname !== "/api/admin/auth"; // <- exceção pro login

  if (!isAdminRoute && !isAdminApi) return NextResponse.next();

  const token = req.cookies.get("sorteios_admin_session")?.value;
  if (!token) return denied(req, isAdminApi);

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return denied(req, isAdminApi);
  }
}

function denied(req: NextRequest, isApi: boolean) {
  if (isApi) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};