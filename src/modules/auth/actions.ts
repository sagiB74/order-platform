"use server";
// Server Actions for authentication. The `"use server"` directive means these
// functions run ONLY on the server, even though a client form calls them. That
// makes them a safe place to touch the database and set cookies.
//
// Security note (from the Next.js guide): treat Server Actions like public API
// endpoints — always validate input and never leak WHY a login failed (we say
// "Invalid email or password" whether the email is unknown or the password is
// wrong, so an attacker can't discover which emails are registered).
import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { verifyPassword } from "@/modules/auth/password";
import { createSession, destroySession } from "@/lib/session";
import { Role } from "@/generated/prisma/enums";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  recordLoginAttempt,
} from "@/modules/auth/rate-limit";

/**
 * A real bcrypt hash of a random string nobody knows. When the email doesn't
 * exist we compare against THIS instead of skipping the check.
 *
 * WHY: bcrypt is deliberately slow (~100ms). Skipping it for unknown emails made
 * those responses measurably faster, so an attacker could tell registered
 * addresses from unregistered ones by timing alone — leaking exactly what the
 * generic error message is there to hide. Burning the same time either way
 * closes that side channel.
 */
const DUMMY_HASH = "$2b$10$jORyr80VML.TRBzaOe8M2uvXMVq6YqUzN.XVeAP3OPOKZ8JiZ3Xsu";

/**
 * Best-effort client IP. Vercel and most proxies set x-forwarded-for; the first
 * entry is the original client. Falls back to a constant, which simply makes the
 * per-IP limit behave as a global one — fail closed, not open.
 */
async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || h.get("x-real-ip") || "unknown";
}

// Where each role goes after logging in.
function homePathForRole(role: Role): string {
  return role === Role.SUPER_ADMIN ? "/admin" : "/dashboard";
}

const LoginSchema = z.object({
  email: z.email().max(254),
  // The max matters: bcrypt hashes the WHOLE input, so an unbounded password is
  // a cheap way to make the server do expensive work (a megabyte-long string
  // costs real CPU per attempt). 200 is far beyond any real passphrase.
  password: z.string().min(1).max(200),
});

// The shape returned to the form so it can show an error. `undefined` = no
// attempt yet (initial state).
export type LoginState = { error: string } | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  // 1. Validate the submitted fields.
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Please enter a valid email and password." };
  }
  // Normalise once: the rate-limit counters and the lookup must agree on the
  // key, or "Admin@x.com" and "admin@x.com" would get separate budgets.
  const email = parsed.data.email.trim().toLowerCase();
  const { password } = parsed.data;
  const ip = await clientIp();

  // 2. Refuse early if this email or this IP has failed too often recently.
  //    Checked BEFORE the bcrypt compare, so a locked-out attacker can't keep
  //    making us burn CPU.
  const verdict = await checkLoginRateLimit(email, ip);
  if (!verdict.allowed) {
    const minutes = Math.ceil(verdict.retryAfterSeconds / 60);
    return {
      error: `Too many login attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  // 3. Look the user up by email.
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, role: true, businessId: true },
  });

  // 4. ALWAYS run a bcrypt compare — against the real hash if the user exists,
  //    against DUMMY_HASH if not. Same generic error and same response time for
  //    "no such user" and "wrong password", so neither the message nor the
  //    timing reveals which emails are registered.
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordOk) {
    await recordLoginAttempt(email, ip, false);
    return { error: "Invalid email or password." };
  }

  await recordLoginAttempt(email, ip, true);
  // A correct password clears the failure budget, so an earlier typo doesn't
  // count against this user's next visit.
  await clearLoginFailures(email);

  // 5. Create the signed session cookie.
  await createSession({
    userId: user.id,
    role: user.role,
    businessId: user.businessId,
  });

  // 6. Send them to the right home. NOTE: redirect() works by throwing an
  //    internal signal, so it must be OUTSIDE any try/catch. It never returns.
  redirect(homePathForRole(user.role));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
