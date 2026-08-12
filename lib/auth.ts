import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "sorteios_admin_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? (() => {
    throw new Error("AUTH_SECRET must be set - do not fall back to a default in production");
  })()
);

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(adminId: string) {
  const token = await new SignJWT({ sub: adminId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function getSessionAdminId(): Promise<string | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.sub as string) ?? null;
  } catch {
    return null; // expired / tampered - treat as logged out
  }
}

export function clearSession() {
  cookies().delete(COOKIE_NAME);
}

/**
 * Every admin API route calls this first. Centralizing it means route
 * protection can't be forgotten on a new endpoint (see middleware.ts, which
 * enforces the same check at the edge for defense in depth).
 */
export async function requireAdmin() {
  const adminId = await getSessionAdminId();
  if (!adminId) {
    const err = new Error("UNAUTHORIZED");
    err.name = "UNAUTHORIZED";
    throw err;
  }
  return adminId;
}
