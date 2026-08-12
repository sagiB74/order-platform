// Proves the businesses service enforces "platform admin only" itself — a
// second line of defense independent of the UI/route checks. These rejections
// happen BEFORE any database access, so the test needs no live DB.
import { describe, it, expect } from "vitest";
import { createBusiness, listBusinesses } from "@/modules/businesses/service";
import { ForbiddenError } from "@/lib/errors";
import type { TenantContext } from "@/modules/tenant/context";

const businessOwner: TenantContext = { kind: "business", businessId: "biz-A" };

describe("businesses service authorization", () => {
  it("a business owner cannot list all businesses", async () => {
    await expect(listBusinesses(businessOwner)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("a business owner cannot create a business", async () => {
    await expect(
      createBusiness(businessOwner, {
        name: "Sneaky Co",
        slug: "sneaky-co",
        ownerEmail: "sneaky@example.com",
        ownerPassword: "password123",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
