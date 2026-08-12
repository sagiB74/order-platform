// Session management — how we remember that a user is logged in.
//
// Strategy: a STATELESS session. After login we put a small, signed token (JWT)
// in an HttpOnly cookie. On later requests we verify the token's signature with
// our SESSION_SECRET; if it's valid and unexpired, we trust its contents. No
// session table needed. The signature is what makes it tamper-proof — a user
// can't edit the cookie to change their role or businessId without invalidating
// the signature.
//
// The token holds the MINIMUM needed to identify the user: userId, role, and
// businessId. Never put passwords or personal data in here.
import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Role } from "@/generated/prisma/enums";

const encodedKey = new TextEncoder().encode(env.SESSION_SECRET);
const COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export type SessionPayload = {
  userId: string;
  role: Role;
  businessId: string | null; // null for SUPER_ADMIN
};

/** Sign the payload into a JWT string valid for 7 days. */
export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

/** Verify + decode a JWT string. Returns null if missing, tampered, or expired. */
export async function decryptSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    // Defensive shape check: never trust decoded data blindly.
    if (typeof payload.userId !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return {
      userId: payload.userId,
      role: payload.role as Role,
      businessId:
        typeof payload.businessId === "string" ? payload.businessId : null,
    };
  } catch {
    // Bad signature / expired token — treat as logged out.
    return null;
  }
}

/** Create the session cookie after a successful login. */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await encryptSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true, // JS on the page can't read it -> mitigates XSS token theft
    secure: env.NODE_ENV === "production", // https-only in prod; allow http on localhost
    sameSite: "lax", // not sent on cross-site POSTs -> mitigates CSRF
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Remove the session cookie (logout). */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Read + verify the session cookie on the current request. */
export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return decryptSession(cookieStore.get(COOKIE_NAME)?.value);
}
