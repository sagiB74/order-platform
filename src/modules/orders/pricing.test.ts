// Unit tests for the order arithmetic — most importantly, the price-tampering
// defence. The customer's cart lives in localStorage, so anyone can open devtools
// and rewrite a price before checking out. These tests pin down that doing so
// changes nothing.
import { describe, it, expect } from "vitest";
import {
  sumQuantities,
  missingProductIds,
  buildOrderLines,
  checkAvailability,
  type InventoryRow,
} from "@/modules/orders/pricing";
import { InventoryMode } from "@/generated/prisma/enums";

describe("buildOrderLines — prices come from the DB, never the client", () => {
  const dbProducts = [{ id: "p1", name: "חלה", priceCents: 4500 }];

  it("IGNORES a price smuggled in on the request", () => {
    // A tampered cart line. `buildOrderLines` has no price parameter at all, so
    // the extra field has nowhere to go — hence the cast to get it past TS.
    const tampered = [{ productId: "p1", quantity: 2, priceCents: 1 }] as never;

    const [line] = buildOrderLines(tampered, dbProducts);

    expect(line!.priceCentsSnapshot).toBe(4500); // the real price, not 1
    expect(line!.quantity).toBe(2);
  });

  it("IGNORES a name smuggled in on the request", () => {
    const tampered = [{ productId: "p1", quantity: 1, name: "Free stuff" }] as never;
    const [line] = buildOrderLines(tampered, dbProducts);
    expect(line!.nameSnapshot).toBe("חלה");
  });

  it("snapshots whatever the DB row currently says", () => {
    // Proves the snapshot follows the database, so a later rename/reprice of the
    // product cannot rewrite an order that was already placed.
    const renamed = [{ id: "p1", name: "חלה מתוקה", priceCents: 5200 }];
    const [line] = buildOrderLines([{ productId: "p1", quantity: 1 }], renamed);
    expect(line!.nameSnapshot).toBe("חלה מתוקה");
    expect(line!.priceCentsSnapshot).toBe(5200);
  });

  it("throws if asked to price a product that wasn't loaded (caller bug)", () => {
    expect(() => buildOrderLines([{ productId: "ghost", quantity: 1 }], dbProducts)).toThrow();
  });
});

describe("missingProductIds", () => {
  it("flags a product that was deleted after the page loaded", () => {
    expect(
      missingProductIds([{ productId: "gone", quantity: 1 }], [{ id: "p1" }]),
    ).toEqual(["gone"]);
  });

  it("flags another tenant's productId", () => {
    // The caller's query is scoped `where: { id: { in: ids }, businessId }`, so a
    // cross-tenant id never comes back from the DB and surfaces here.
    expect(
      missingProductIds(
        [{ productId: "p1", quantity: 1 }, { productId: "other-tenant-product", quantity: 1 }],
        [{ id: "p1" }],
      ),
    ).toEqual(["other-tenant-product"]);
  });

  it("returns nothing when every product resolved", () => {
    expect(missingProductIds([{ productId: "p1", quantity: 1 }], [{ id: "p1" }])).toEqual([]);
  });
});

describe("sumQuantities", () => {
  it("sums duplicate lines for the same product", () => {
    const totals = sumQuantities([
      { productId: "p1", quantity: 3 },
      { productId: "p1", quantity: 3 },
      { productId: "p2", quantity: 1 },
    ]);
    expect(totals.get("p1")).toBe(6);
    expect(totals.get("p2")).toBe(1);
  });
});

describe("checkAvailability", () => {
  const NOW = new Date("2026-08-24T12:00:00Z");
  const base = { limitMaxQuantity: null, limitSoldCount: 0, limitExpiresAt: null };
  const row = (over: Partial<InventoryRow>): InventoryRow => ({
    id: "p1",
    inventoryMode: InventoryMode.UNLIMITED,
    ...base,
    ...over,
  });

  it("UNLIMITED is always fine", () => {
    expect(checkAvailability([{ productId: "p1", quantity: 99 }], [row({})], NOW)).toEqual([]);
  });

  it("OUT_OF_STOCK is refused", () => {
    expect(
      checkAvailability(
        [{ productId: "p1", quantity: 1 }],
        [row({ inventoryMode: InventoryMode.OUT_OF_STOCK })],
        NOW,
      ),
    ).toEqual([{ productId: "p1", reason: "OUT_OF_STOCK", availableQuantity: 0 }]);
  });

  it("LIMITED: allows a quantity within what's left", () => {
    const limited = row({
      inventoryMode: InventoryMode.LIMITED,
      limitMaxQuantity: 5,
      limitSoldCount: 3,
      limitExpiresAt: new Date("2026-09-01T00:00:00Z"),
    });
    expect(checkAvailability([{ productId: "p1", quantity: 2 }], [limited], NOW)).toEqual([]);
  });

  it("LIMITED: refuses an over-order and reports how many remain", () => {
    const limited = row({
      inventoryMode: InventoryMode.LIMITED,
      limitMaxQuantity: 5,
      limitSoldCount: 3,
      limitExpiresAt: new Date("2026-09-01T00:00:00Z"),
    });
    expect(checkAvailability([{ productId: "p1", quantity: 3 }], [limited], NOW)).toEqual([
      { productId: "p1", reason: "LIMITED", availableQuantity: 2 },
    ]);
  });

  it("LIMITED: checks the SUM of duplicate lines, not each line", () => {
    // 3 + 3 against a cap of 5. Checking per-line would let this through twice.
    const limited = row({
      inventoryMode: InventoryMode.LIMITED,
      limitMaxQuantity: 5,
      limitSoldCount: 0,
      limitExpiresAt: new Date("2026-09-01T00:00:00Z"),
    });
    const problems = checkAvailability(
      [
        { productId: "p1", quantity: 3 },
        { productId: "p1", quantity: 3 },
      ],
      [limited],
      NOW,
    );
    expect(problems).toEqual([{ productId: "p1", reason: "LIMITED", availableQuantity: 5 }]);
  });

  it("LIMITED: an EXPIRED window counts as unlimited", () => {
    // Mirrors the lazy revert in catalog/service.ts listProducts. Without this,
    // a customer would be refused for a limit the next catalog read would clear.
    const expired = row({
      inventoryMode: InventoryMode.LIMITED,
      limitMaxQuantity: 5,
      limitSoldCount: 5,
      limitExpiresAt: new Date("2026-08-01T00:00:00Z"), // before NOW
    });
    expect(checkAvailability([{ productId: "p1", quantity: 10 }], [expired], NOW)).toEqual([]);
  });

  it("ignores products that weren't loaded (missingProductIds reports those)", () => {
    expect(checkAvailability([{ productId: "ghost", quantity: 1 }], [], NOW)).toEqual([]);
  });
});
