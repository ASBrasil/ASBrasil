import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "sorteios_participant";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? (() => {
    throw new Error("AUTH_SECRET must be set");
  })()
);

/**
 * There's no password for participants - the "login" is just "we've seen
 * this e-mail before in at least one campaign". This session cookie exists
 * so someone doesn't have to retype their e-mail every visit; it is NOT a
 * security boundary the way the admin session is. Nothing sensitive should
 * ever be derived from it beyond "which e-mail is this browser probably".
 */
export async function createParticipantSession(email: string) {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getParticipantEmail(): Promise<string | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.email as string) ?? null;
  } catch {
    return null;
  }
}

export function clearParticipantSession() {
  cookies().delete(COOKIE_NAME);
}
