// The tenant isolation spine.
//
// Every request that touches business-owned data must first establish WHO is
// asking and WHICH business they're allowed to touch. That answer is a
// TenantContext. It is ALWAYS built on the server from trusted inputs:
//   - dashboard/admin requests  -> derived from the authenticated session
//   - public storefront requests -> derived from the URL slug (read-only)
// It is NEVER built from a client-supplied businessId in a body or query.
//
// Business logic then calls `assertCanAccessBusiness(ctx, someBusinessId)`
// before returning or mutating any row, so a bug or a crafted request can't
// leak one tenant's data to another.
import { ForbiddenError } from "@/lib/errors";

export type TenantContext =
  // A platform super-admin. May act across all businesses.
  | { kind: "platform" }
  // A signed-in business owner, locked to exactly one business.
  | { kind: "business"; businessId: string }
  // An anonymous public visitor viewing one storefront (read-only).
  | { kind: "storefront"; businessId: string };

/**
 * Throws ForbiddenError unless `ctx` is allowed to access `businessId`.
 * - platform admins: allowed everywhere
 * - business owners / storefront visitors: only their own business
 *
 * Call this in EVERY service function that reads or writes a business-owned
 * row, passing the businessId that the row belongs to.
 */
export function assertCanAccessBusiness(
  ctx: TenantContext,
  businessId: string,
): void {
  if (ctx.kind === "platform") return;
  if (ctx.businessId === businessId) return;
  throw new ForbiddenError();
}

/**
 * Convenience for the common case: get the single business a non-platform
 * context is scoped to. Useful when building a `where: { businessId }` filter.
 * Returns null for platform admins (who aren't scoped to one business).
 */
export function currentBusinessId(ctx: TenantContext): string | null {
  return ctx.kind === "platform" ? null : ctx.businessId;
}
