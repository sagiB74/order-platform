// Catalog module — all logic for a business's categories and products.
//
// SAME rule as the businesses service: every function takes a TenantContext and
// checks it BEFORE touching data, so tenant isolation lives here next to the
// database, not in the UI. Two shapes of guard appear below:
//
//   1. When the caller already names the business (list/create), we call
//      `assertCanAccessBusiness(ctx, businessId)` up front — it throws before
//      any DB access if the caller isn't allowed near that business.
//
//   2. When the caller only knows a productId (update/delete/toggle), we must
//      first LOAD the row to learn which business owns it, THEN assert. We never
//      trust a client-supplied businessId; the owning id comes from the row.
import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertCanAccessBusiness, type TenantContext } from "@/modules/tenant/context";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { InventoryMode } from "@/generated/prisma/enums";

// ---- Validation ------------------------------------------------------------

export const CreateCategoryInput = z.object({
  name: z.string().trim().min(1, { error: "Category name is required." }).max(60),
});
export type CreateCategoryInput = z.infer<typeof CreateCategoryInput>;

export const CreateProductInput = z.object({
  name: z.string().trim().min(1, { error: "Product name is required." }).max(80),
  // Money as integer agorot/cents. 0 is allowed (e.g. a free sample).
  priceCents: z
    .number({ error: "Price is required." })
    .int({ error: "Price must be a whole number of agorot." })
    .min(0, { error: "Price cannot be negative." })
    .max(10_000_000, { error: "Price is too large." }),
  description: z.string().trim().max(500).optional(),
  imageUrl: z.string().trim().url({ error: "Image must be a valid URL." }).optional(),
  categoryId: z.string().trim().min(1).optional(),
});
export type CreateProductInput = z.infer<typeof CreateProductInput>;

// Update allows any subset of the same fields. categoryId can be set to null to
// "uncategorize" a product, so we accept null explicitly here.
export const UpdateProductInput = CreateProductInput.partial().extend({
  categoryId: z.string().trim().min(1).nullable().optional(),
});
export type UpdateProductInput = z.infer<typeof UpdateProductInput>;

export const SetInventoryLimitedInput = z.object({
  days: z.number().int().min(1, { error: "Enter at least 1 day." }).max(365),
  maxQuantity: z.number().int().min(1, { error: "Enter at least 1 unit." }).max(100_000),
});
export type SetInventoryLimitedInput = z.infer<typeof SetInventoryLimitedInput>;

// ---- Categories ------------------------------------------------------------

/** List one business's categories (ordered). Caller must be allowed near it. */
export async function listCategories(ctx: TenantContext, businessId: string) {
  assertCanAccessBusiness(ctx, businessId);
  return db.category.findMany({
    where: { businessId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, sortOrder: true },
  });
}

/** Create a category for a business. Caller must be allowed near it. */
export async function createCategory(
  ctx: TenantContext,
  businessId: string,
  input: CreateCategoryInput,
) {
  assertCanAccessBusiness(ctx, businessId);
  return db.category.create({
    data: { businessId, name: input.name },
    select: { id: true, name: true, sortOrder: true },
  });
}

// ---- Products --------------------------------------------------------------

/**
 * List a business's products, each with its (optional) category name.
 * The `assertCanAccessBusiness` up top is what stops owner A from ever
 * reading owner B's products, even with a crafted businessId.
 *
 * Also does the LAZY half of the inventory-limit state machine: any LIMITED
 * product whose window has expired reverts to UNLIMITED right here, before
 * the read — there's no cron in this app, so "check on every read" is how
 * the revert actually happens. Runs for BOTH the dashboard and the storefront
 * (both call this), so a product's availability update reaches shoppers too,
 * not just whenever the owner happens to reopen the dashboard.
 */
export async function listProducts(ctx: TenantContext, businessId: string) {
  assertCanAccessBusiness(ctx, businessId);

  await db.product.updateMany({
    where: { businessId, inventoryMode: InventoryMode.LIMITED, limitExpiresAt: { lt: new Date() } },
    data: {
      inventoryMode: InventoryMode.UNLIMITED,
      limitMaxQuantity: null,
      limitSoldCount: 0,
      limitExpiresAt: null,
    },
  });

  const products = await db.product.findMany({
    where: { businessId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      imageUrl: true,
      inventoryMode: true,
      limitMaxQuantity: true,
      limitSoldCount: true,
      limitExpiresAt: true,
      categoryId: true,
      category: { select: { id: true, name: true } },
    },
  });

  // Derived, read-only convenience field: consumers that just want a yes/no
  // (like the storefront's availability filter) don't need to know about the
  // 3-state mode at all.
  return products.map((p) => ({ ...p, isAvailable: p.inventoryMode !== InventoryMode.OUT_OF_STOCK }));
}

/**
 * Create a product under a business. If a categoryId is given, we verify that
 * category belongs to the SAME business — otherwise an owner could attach their
 * product to another tenant's category (a cross-tenant reference leak).
 */
export async function createProduct(
  ctx: TenantContext,
  businessId: string,
  input: CreateProductInput,
) {
  assertCanAccessBusiness(ctx, businessId);

  if (input.categoryId) {
    await assertCategoryBelongsToBusiness(input.categoryId, businessId);
  }

  return db.product.create({
    data: {
      businessId,
      name: input.name,
      priceCents: input.priceCents,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      categoryId: input.categoryId ?? null,
      // inventoryMode defaults to UNLIMITED via the schema — a new product is
      // orderable immediately, matching the old isAvailable-defaults-true behavior.
    },
  });
}

/**
 * Update a product. We load it first to learn its owning business, assert the
 * caller may touch that business, and (if the category changes) re-verify the
 * new category is owned by the same business.
 */
export async function updateProduct(
  ctx: TenantContext,
  productId: string,
  input: UpdateProductInput,
) {
  const existing = await db.product.findUnique({
    where: { id: productId },
    select: { id: true, businessId: true },
  });
  if (!existing) throw new NotFoundError("Product not found.");
  assertCanAccessBusiness(ctx, existing.businessId);

  if (input.categoryId) {
    await assertCategoryBelongsToBusiness(input.categoryId, existing.businessId);
  }

  return db.product.update({
    where: { id: productId },
    data: {
      // Only apply fields that were actually provided.
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      // categoryId may be explicitly set to null to uncategorize.
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    },
  });
}

// ---- Inventory mode ---------------------------------------------------------
// Three dashboard actions, one shared ownership check. Each loads the product
// first (never trusts a client-supplied businessId), same pattern as
// updateProduct/deleteProduct below.

async function loadOwnedProduct(ctx: TenantContext, productId: string) {
  const existing = await db.product.findUnique({
    where: { id: productId },
    select: { businessId: true },
  });
  if (!existing) throw new NotFoundError("Product not found.");
  assertCanAccessBusiness(ctx, existing.businessId);
}

/** Directly mark a product out of stock (owner-initiated, not the auto-flip). */
export async function setInventoryOutOfStock(ctx: TenantContext, productId: string) {
  await loadOwnedProduct(ctx, productId);
  return db.product.update({
    where: { id: productId },
    data: { inventoryMode: InventoryMode.OUT_OF_STOCK },
    select: { id: true, inventoryMode: true },
  });
}

/** Back to always-orderable; clears any leftover limit bookkeeping. */
export async function setInventoryUnlimited(ctx: TenantContext, productId: string) {
  await loadOwnedProduct(ctx, productId);
  return db.product.update({
    where: { id: productId },
    data: {
      inventoryMode: InventoryMode.UNLIMITED,
      limitMaxQuantity: null,
      limitSoldCount: 0,
      limitExpiresAt: null,
    },
    select: { id: true, inventoryMode: true },
  });
}

/**
 * Start (or restart) a time-boxed run: sold count always resets to 0 here,
 * even if the product was already LIMITED — this is "set a new limit", not
 * "adjust the existing one". createOrder is what advances limitSoldCount and
 * auto-flips to OUT_OF_STOCK when it reaches limitMaxQuantity; listProducts
 * is what lazily reverts this back to UNLIMITED once limitExpiresAt passes.
 */
export async function setInventoryLimited(
  ctx: TenantContext,
  productId: string,
  input: SetInventoryLimitedInput,
) {
  await loadOwnedProduct(ctx, productId);
  const parsed = SetInventoryLimitedInput.parse(input);
  const limitExpiresAt = new Date();
  limitExpiresAt.setDate(limitExpiresAt.getDate() + parsed.days);

  return db.product.update({
    where: { id: productId },
    data: {
      inventoryMode: InventoryMode.LIMITED,
      limitMaxQuantity: parsed.maxQuantity,
      limitSoldCount: 0,
      limitExpiresAt,
    },
    select: { id: true, inventoryMode: true, limitMaxQuantity: true, limitExpiresAt: true },
  });
}

/** Delete a product, after confirming the caller owns it. */
export async function deleteProduct(ctx: TenantContext, productId: string) {
  const existing = await db.product.findUnique({
    where: { id: productId },
    select: { businessId: true },
  });
  if (!existing) throw new NotFoundError("Product not found.");
  assertCanAccessBusiness(ctx, existing.businessId);

  await db.product.delete({ where: { id: productId } });
}

// ---- helpers ---------------------------------------------------------------

/**
 * Guarantee a category exists AND is owned by the expected business. Uses a
 * businessId-scoped lookup so a category from another tenant simply isn't found.
 */
async function assertCategoryBelongsToBusiness(
  categoryId: string,
  businessId: string,
) {
  const category = await db.category.findFirst({
    where: { id: categoryId, businessId },
    select: { id: true },
  });
  if (!category) {
    throw new ValidationError("That category doesn't belong to this business.");
  }
}
