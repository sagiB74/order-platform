// The most important test in the codebase: it proves our tenant-isolation rule.
// If this ever fails, one business could see another's data — a critical bug.
import { describe, it, expect } from "vitest";
import {
  assertCanAccessBusiness,
  assertCanManageBusiness,
  assertIsManager,
  currentBusinessId,
  type TenantContext,
} from "@/modules/tenant/context";
import { ForbiddenError } from "@/lib/errors";

describe("tenant isolation (assertCanAccessBusiness)", () => {
  const platform: TenantContext = { kind: "platform" };
  const ownerA: TenantContext = { kind: "business", businessId: "biz-A" };
  const visitorB: TenantContext = { kind: "storefront", businessId: "biz-B" };

  it("platform admin can access ANY business", () => {
    expect(() => assertCanAccessBusiness(platform, "biz-A")).not.toThrow();
    expect(() => assertCanAccessBusiness(platform, "biz-Z")).not.toThrow();
  });

  it("a business owner can access their OWN business", () => {
    expect(() => assertCanAccessBusiness(ownerA, "biz-A")).not.toThrow();
  });

  it("a business owner CANNOT access another business", () => {
    // This is the leak we're preventing.
    expect(() => assertCanAccessBusiness(ownerA, "biz-B")).toThrow(
      ForbiddenError,
    );
  });

  it("a storefront visitor is locked to the one business they're viewing", () => {
    expect(() => assertCanAccessBusiness(visitorB, "biz-B")).not.toThrow();
    expect(() => assertCanAccessBusiness(visitorB, "biz-A")).toThrow(
      ForbiddenError,
    );
  });

  it("currentBusinessId: null for platform, the id for a tenant", () => {
    expect(currentBusinessId(platform)).toBeNull();
    expect(currentBusinessId(ownerA)).toBe("biz-A");
    expect(currentBusinessId(visitorB)).toBe("biz-B");
  });
});

// The second half of the isolation rule, added when the public storefront gained
// the ability to CREATE an order. Before this, `assertCanAccessBusiness` was the
// only guard and it compares businessId alone — so an anonymous visitor browsing
// /acme (a storefront context scoped to acme) passed the very same check the
// owner's "approve this order" and "delete this product" paths used.
//
// Nothing exploited that, because no public write path existed yet. Adding
// checkout is exactly what would have made it reachable, so the guard splits in
// two: "may you come near this business at all" vs "may you MANAGE it".
describe("storefront visitors cannot manage (assertCanManageBusiness)", () => {
  const platform: TenantContext = { kind: "platform" };
  const ownerA: TenantContext = { kind: "business", businessId: "biz-A" };
  const visitorB: TenantContext = { kind: "storefront", businessId: "biz-B" };

  it("REFUSES a storefront visitor even for their OWN business", () => {
    // The headline rule. The business matches, and the plain access check below
    // still passes — but managing it is off-limits.
    expect(() => assertCanManageBusiness(visitorB, "biz-B")).toThrow(ForbiddenError);
    expect(() => assertCanAccessBusiness(visitorB, "biz-B")).not.toThrow();
  });

  it("still lets a storefront visitor READ their own business", () => {
    // createOrder and the catalog list functions must stay reachable — this is
    // what keeps a customer able to browse and place an order.
    expect(() => assertCanAccessBusiness(visitorB, "biz-B")).not.toThrow();
  });

  it("allows a signed-in owner to manage their own business only", () => {
    expect(() => assertCanManageBusiness(ownerA, "biz-A")).not.toThrow();
    expect(() => assertCanManageBusiness(ownerA, "biz-B")).toThrow(ForbiddenError);
  });

  it("allows a platform admin to manage any business", () => {
    expect(() => assertCanManageBusiness(platform, "biz-A")).not.toThrow();
    expect(() => assertCanManageBusiness(platform, "biz-Z")).not.toThrow();
  });

  it("assertIsManager: kind-only check, used before a row is loaded", () => {
    // The id-only functions (setOrderStatus, rejectOrder, getOrder, deleteProduct)
    // call this FIRST so an anonymous caller is rejected without a DB round-trip.
    expect(() => assertIsManager(visitorB)).toThrow(ForbiddenError);
    expect(() => assertIsManager(ownerA)).not.toThrow();
    expect(() => assertIsManager(platform)).not.toThrow();
  });
});
