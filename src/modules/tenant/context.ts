// The tenant isolation spine.
//
// Every request that touches business-owned data must first establish WHO is
// asking and WHICH business they're allowed to touch. That answer is a
// TenantContext. It is ALWAYS built on the server from trusted inputs:
//   - dashboard/admin requests  -> derived from the authenticated session
//   - public storefront requests -> derived from the URL slug
// It is NEVER built from a client-supplied businessId in a body or query.
//
// Business logic then calls `assertCanAccessBusiness(ctx, someBusinessId)`
// before returning or mutating any row, so a bug or a crafted request can't
// leak one tenant's data to another.
import { ForbiddenError } from "@/lib/errors";

// A platform super-admin. May act across all businesses.
export type PlatformContext = { kind: "platform" };
// A signed-in business owner, locked to exactly one business.
export type BusinessContext = { kind: "business"; businessId: string };
// An anonymous public visitor on one storefront. May READ that business's
// catalog and may place an order — nothing else.
export type StorefrontContext = { kind: "storefront"; businessId: string };

export type TenantContext = PlatformContext | BusinessContext | StorefrontContext;

/**
 * The contexts that come from an AUTHENTICATED SESSION. Excludes `storefront`
 * by construction.
 *
 * This is the type half of the storefront lockdown. `toTenantContext()` in
 * src/lib/dal.ts returns exactly this, and it is the only way a session becomes
 * a context — so a service whose parameter is typed `ctx: ManageContext` simply
 * CANNOT be called with an anonymous visitor's context. That's a compile error,
 * not a convention someone has to remember. The runtime asserts below stay as
 * defence-in-depth, because types are erased at runtime and `as any` exists.
 */
export type ManageContext = PlatformContext | BusinessContext;

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
 * Kind-only check: is this caller a SIGNED-IN manager at all?
 *
 * Exists separately from assertCanManageBusiness because several functions
 * (setOrderStatus, rejectOrder, getOrder, loadOwnedProduct) receive only a row
 * id and must load the row before they can know which business owns it. Calling
 * this FIRST lets them fail closed before touching the database — which is both
 * the safer ordering and what keeps the tests for those functions DB-free.
 */
export function assertIsManager(
  ctx: TenantContext,
): asserts ctx is ManageContext {
  if (ctx.kind === "storefront") {
    throw new ForbiddenError("Storefront visitors cannot manage this business.");
  }
}

/**
 * The owner-only guard: the caller must be a signed-in manager AND be allowed
 * near this specific business.
 *
 * Use this for every MUTATION and every owner-facing read. The difference from
 * assertCanAccessBusiness matters: an anonymous visitor browsing /acme has a
 * storefront context scoped to acme's businessId, so it passes the plain access
 * check for acme. It must still never be able to approve an order or edit a
 * product — that's exactly what this rejects.
 */
export function assertCanManageBusiness(
  ctx: TenantContext,
  businessId: string,
): asserts ctx is ManageContext {
  assertIsManager(ctx);
  assertCanAccessBusiness(ctx, businessId);
}

/**
 * Convenience for the common case: get the single business a non-platform
 * context is scoped to. Useful when building a `where: { businessId }` filter.
 * Returns null for platform admins (who aren't scoped to one business).
 */
export function currentBusinessId(ctx: TenantContext): string | null {
  return ctx.kind === "platform" ? null : ctx.businessId;
}
