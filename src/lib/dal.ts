// Data Access Layer (DAL) — the single, trusted entry point for "who is the
// current user, and what are they allowed to touch?"
//
// Next.js recommends centralizing auth checks here (not in layouts) so that
// every server component, Server Action, and route handler asks the SAME
// function and can't forget a check. This is also where authentication (a
// verified session) becomes a TenantContext (our isolation primitive).
//
// Two levels, mirroring the Next.js guide:
//   - getSession(): OPTIMISTIC — just the signed cookie (fast, no DB hit).
//   - getCurrentUser(): SECURE — re-reads the user from the DB, so a
//     deactivated/deleted user or a changed role/business is caught.
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readSession, type SessionPayload } from "@/lib/session";
import { Role } from "@/generated/prisma/enums";
import type { ManageContext } from "@/modules/tenant/context";

// What we expose about the logged-in user. Note: NO passwordHash — a DTO of
// only the safe fields, so sensitive columns never leak out of this layer.
export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  businessId: string | null;
};

/**
 * Optimistic: the verified session payload from the cookie, or null.
 * `cache` memoizes it for the duration of one server render/request so we
 * don't decrypt the cookie repeatedly.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  return readSession();
});

/**
 * Secure: the current user, freshly loaded from the database.
 * Returns null if there is no valid session OR the user no longer exists.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const session = await getSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, role: true, businessId: true },
  });

  return user ?? null;
});

/** Like getCurrentUser, but redirects to /login instead of returning null. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Turn the authenticated user into a TenantContext — the object every service
 * uses to enforce isolation. Built from the DB user (secure), never from a
 * client-supplied value.
 *
 * Returns the narrower `ManageContext` (platform | business) rather than the
 * full TenantContext, and deliberately so: a session can never produce a
 * `storefront` context. That's what lets owner-only services declare
 * `ctx: ManageContext` and become uncallable with an anonymous visitor's
 * context at COMPILE time.
 */
export function toTenantContext(user: AuthUser): ManageContext {
  if (user.role === Role.SUPER_ADMIN) {
    return { kind: "platform" };
  }
  // A BUSINESS_OWNER must have a businessId; if not, the data is inconsistent.
  if (!user.businessId) {
    throw new Error(
      `User ${user.id} has role BUSINESS_OWNER but no businessId — data integrity error.`,
    );
  }
  return { kind: "business", businessId: user.businessId };
}

/** Convenience: require a logged-in user and return their TenantContext. */
export async function requireTenantContext(): Promise<{
  user: AuthUser;
  ctx: ManageContext;
}> {
  const user = await requireUser();
  return { user, ctx: toTenantContext(user) };
}
