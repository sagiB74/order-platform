// Data-level isolation for the catalog: an owner may only touch THEIR OWN
// business's products/categories. These functions call assertCanAccessBusiness
// BEFORE any database access, so a cross-tenant attempt is rejected up front and
// the test needs no live DB — the rejection is the whole point.
import { describe, it, expect } from "vitest";
import {
  listProducts,
  createProduct,
  listCategories,
  createCategory,
} from "@/modules/catalog/service";
import { ForbiddenError } from "@/lib/errors";
import type { TenantContext } from "@/modules/tenant/context";

const ownerA: TenantContext = { kind: "business", businessId: "biz-A" };
const OTHER = "biz-B";

describe("catalog tenant isolation", () => {
  it("owner A cannot LIST owner B's products", async () => {
    await expect(listProducts(ownerA, OTHER)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("owner A cannot CREATE a product under owner B's business", async () => {
    await expect(
      createProduct(ownerA, OTHER, { name: "Sneaky loaf", priceCents: 1000 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("owner A cannot LIST owner B's categories", async () => {
    await expect(listCategories(ownerA, OTHER)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("owner A cannot CREATE a category under owner B's business", async () => {
    await expect(
      createCategory(ownerA, OTHER, { name: "Sneaky" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
