// Pure order arithmetic: turning "what the customer asked for" plus "what the
// database says" into the lines we actually store, and deciding whether the
// request is still fulfillable.
//
// Deliberately has NO database access, no `server-only`, and no imports beyond
// the InventoryMode enum. Two reasons:
//
//   1. The price rule below is a security control, and a control you can unit
//      test in milliseconds is one that actually gets tested. See pricing.test.ts.
//   2. Keeping it separate from the service means the rule is stated in exactly
//      one place instead of being spread through a long transaction body.
import { InventoryMode } from "@/generated/prisma/enums";

export type OrderItemInput = { productId: string; quantity: number };

/** The authoritative product fields, as loaded from the database. */
export type PricedProduct = {
  id: string;
  name: string;
  priceCents: number;
};

/** One line ready to be written to order_items (minus businessId, which the caller adds). */
export type OrderLine = {
  productId: string;
  nameSnapshot: string;
  priceCentsSnapshot: number;
  quantity: number;
};

/**
 * Sum quantities per product id. An order can legitimately mention the same
 * product more than once (two separate lines), and every limit check has to be
 * made against the TOTAL, not each line — otherwise ordering 3+3 of a product
 * capped at 5 would pass two independent "is 3 <= 5?" checks.
 */
export function sumQuantities(items: OrderItemInput[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
  }
  return totals;
}

/**
 * Product ids the request references that the database didn't return.
 *
 * The caller loads products with a `where: { id: { in: ids }, businessId }`
 * filter, so this covers BOTH "deleted since the page loaded" and "belongs to a
 * different tenant" — a crafted productId from another business simply doesn't
 * come back, and lands here.
 */
export function missingProductIds(
  items: OrderItemInput[],
  products: { id: string }[],
): string[] {
  const known = new Set(products.map((p) => p.id));
  return [...new Set(items.map((i) => i.productId))].filter((id) => !known.has(id));
}

/**
 * Build the order lines to persist.
 *
 * SECURITY: this function has no price parameter and no name parameter. Both
 * are read from `products` — the rows the server just loaded from the database.
 * The customer's cart lives in localStorage and is trivially editable, so a
 * price arriving from the client is not merely distrusted here, it has nowhere
 * to enter. Tampering is impossible by SHAPE rather than by validation.
 *
 * Snapshotting also serves a second, non-security purpose: a later rename or
 * repricing of the product must never rewrite the history of an order that was
 * already placed.
 */
export function buildOrderLines(
  items: OrderItemInput[],
  products: PricedProduct[],
): OrderLine[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return items.map((item) => {
    const product = byId.get(item.productId);
    if (!product) {
      // Callers must run missingProductIds() first; reaching here is a bug.
      throw new Error(`buildOrderLines: no product loaded for id ${item.productId}`);
    }
    return {
      productId: product.id,
      nameSnapshot: product.name,
      priceCentsSnapshot: product.priceCents,
      quantity: item.quantity,
    };
  });
}

/** The inventory fields needed to judge availability. */
export type InventoryRow = {
  id: string;
  inventoryMode: InventoryMode;
  limitMaxQuantity: number | null;
  limitSoldCount: number;
  limitExpiresAt: Date | null;
};

export type UnavailableReason = "REMOVED" | "OUT_OF_STOCK" | "LIMITED";

export type UnavailableLine = {
  productId: string;
  reason: UnavailableReason;
  /** How many the customer COULD still order. 0 for REMOVED and OUT_OF_STOCK. */
  availableQuantity: number;
};

/**
 * Carries no product name on purpose: the client already has the name in its own
 * cart line, and a REMOVED product has no name left to report.
 */

/**
 * Decide which requested lines can't be fulfilled. Pure — `now` is injected so
 * the expiry branch is testable without mocking the clock.
 *
 * An expired LIMITED window counts as UNLIMITED. That mirrors the lazy revert in
 * catalog/service.ts (`listProducts` reverts expired limits on every read, since
 * there's no cron in this app); without this branch a customer could be refused
 * for a limit that the very next catalog read would have cleared.
 */
export function checkAvailability(
  items: OrderItemInput[],
  products: InventoryRow[],
  now: Date,
): UnavailableLine[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const problems: UnavailableLine[] = [];

  for (const [productId, wanted] of sumQuantities(items)) {
    const product = byId.get(productId);
    if (!product) continue; // missingProductIds() reports these as REMOVED.

    if (product.inventoryMode === InventoryMode.OUT_OF_STOCK) {
      problems.push({ productId, reason: "OUT_OF_STOCK", availableQuantity: 0 });
      continue;
    }

    if (product.inventoryMode !== InventoryMode.LIMITED) continue;

    const expired =
      product.limitExpiresAt !== null && product.limitExpiresAt.getTime() < now.getTime();
    if (expired) continue; // Treated as UNLIMITED; listProducts will clear it.

    if (product.limitMaxQuantity === null) continue; // LIMITED with no cap set.

    const remaining = product.limitMaxQuantity - product.limitSoldCount;
    if (wanted > remaining) {
      problems.push({
        productId,
        reason: "LIMITED",
        availableQuantity: Math.max(0, remaining),
      });
    }
  }

  return problems;
}
