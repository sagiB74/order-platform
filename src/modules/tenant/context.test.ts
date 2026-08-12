// The most important test in the codebase: it proves our tenant-isolation rule.
// If this ever fails, one business could see another's data — a critical bug.
import { describe, it, expect } from "vitest";
import {
  assertCanAccessBusiness,
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
