// Brute-force protection for the login form.
//
// The login action is a public, unauthenticated endpoint on the open internet.
// Without a limiter, an attacker can try passwords as fast as the server will
// answer, and each attempt costs us a deliberately-slow bcrypt compare — so it
// is both a credential-stuffing risk AND a cheap way to burn our CPU.
//
// Backed by Postgres rather than an in-memory Map, because this deploys to
// serverless: instances are short-lived and don't share memory, so a process-local
// counter would reset constantly and protect nothing.
//
// Two independent limits, because they stop different attacks:
//   - per EMAIL: stops someone hammering one known account from many addresses.
//   - per IP:    stops someone spraying one password across many accounts.
import "server-only";
import { db } from "@/lib/db";

/** How far back we count failures. */
export const WINDOW_MINUTES = 15;
/** Failed attempts against ONE email before it's locked for the rest of the window. */
export const MAX_FAILURES_PER_EMAIL = 5;
/** Failed attempts from ONE ip before it's locked, across all emails. */
export const MAX_FAILURES_PER_IP = 20;
/** Rows older than this are pruned opportunistically. */
const RETENTION_HOURS = 24;

export type RateLimitVerdict =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

function windowStart(now: Date): Date {
  return new Date(now.getTime() - WINDOW_MINUTES * 60_000);
}

/**
 * Should this login attempt be allowed to proceed to the password check?
 *
 * Counts only FAILED attempts: a successful login clears the way (see
 * clearLoginFailures), so a legitimate user who mistypes twice and then gets it
 * right isn't penalised on their next visit.
 */
export async function checkLoginRateLimit(
  email: string,
  ipAddress: string,
  now: Date = new Date(),
): Promise<RateLimitVerdict> {
  const since = windowStart(now);

  const [emailFailures, ipFailures] = await Promise.all([
    db.loginAttempt.count({
      where: { email, succeeded: false, createdAt: { gte: since } },
    }),
    db.loginAttempt.count({
      where: { ipAddress, succeeded: false, createdAt: { gte: since } },
    }),
  ]);

  if (emailFailures < MAX_FAILURES_PER_EMAIL && ipFailures < MAX_FAILURES_PER_IP) {
    return { allowed: true };
  }

  // Tell them how long to wait, based on the OLDEST failure still in the window
  // — that's the one whose expiry frees up a slot.
  const oldest = await db.loginAttempt.findFirst({
    where: {
      succeeded: false,
      createdAt: { gte: since },
      ...(emailFailures >= MAX_FAILURES_PER_EMAIL ? { email } : { ipAddress }),
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const freeAt = (oldest?.createdAt.getTime() ?? now.getTime()) + WINDOW_MINUTES * 60_000;
  const retryAfterSeconds = Math.max(1, Math.ceil((freeAt - now.getTime()) / 1000));
  return { allowed: false, retryAfterSeconds };
}

/**
 * Record an attempt. Never throws: a logging failure must not take down login,
 * and must not become a way to probe the database.
 */
export async function recordLoginAttempt(
  email: string,
  ipAddress: string,
  succeeded: boolean,
): Promise<void> {
  try {
    await db.loginAttempt.create({ data: { email, ipAddress, succeeded } });

    // Opportunistic prune (~2% of writes) so the table stays small without a cron.
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - RETENTION_HOURS * 3_600_000);
      await db.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } });
    }
  } catch (err) {
    console.error("recordLoginAttempt failed:", err);
  }
}

/** Wipe an email's failures after a successful login, so it starts clean. */
export async function clearLoginFailures(email: string): Promise<void> {
  try {
    await db.loginAttempt.deleteMany({ where: { email, succeeded: false } });
  } catch (err) {
    console.error("clearLoginFailures failed:", err);
  }
}
