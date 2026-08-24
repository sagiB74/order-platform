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
  deleteProduct,
  setInventoryOutOfStock,
} from "@/modules/catalog/service";
import { ForbiddenError } from "@/lib/errors";
import type { ManageContext } from "@/modules/tenant/context";

const ownerA: ManageContext = { kind: "business", businessId: "biz-A" };
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

// See the long note in modules/orders/service.test.ts: the cast is deliberate,
// proving the RUNTIME guard rejects an anonymous caller even if the compile-time
// `ManageContext` barrier is bypassed.
const storefrontA = {
  kind: "storefront",
  businessId: "biz-A",
} as unknown as ManageContext;

describe("a storefront context cannot mutate the catalog", () => {
  it("cannot CREATE a product", async () => {
    await expect(
      createProduct(storefrontA, "biz-A", { name: "Free cake", priceCents: 0 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("cannot CREATE a category", async () => {
    await expect(
      createCategory(storefrontA, "biz-A", { name: "Injected" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("cannot DELETE a product", async () => {
    await expect(deleteProduct(storefrontA, "prod-1")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("cannot mark a product out of stock", async () => {
    await expect(
      setInventoryOutOfStock(storefrontA, "prod-1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
