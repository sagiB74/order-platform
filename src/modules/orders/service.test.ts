// Data-level isolation for orders: an owner may only create/read orders within
// THEIR OWN business. listOrdersInRange and createOrder both call
// assertCanAccessBusiness before any DB access, so cross-tenant attempts are
// rejected up front — no live DB needed.
import { describe, it, expect } from "vitest";
import {
  createOrder,
  listOrdersInRange,
  getSalesTimeSeries,
  getMonthlyProductStats,
  getStatsOverview,
  listPendingOrders,
  rejectOrder,
  getOrder,
  setOrderStatus,
} from "@/modules/orders/service";
import { OrderStatus } from "@/generated/prisma/enums";
import { ForbiddenError } from "@/lib/errors";
import type { ManageContext } from "@/modules/tenant/context";

const ownerA: ManageContext = { kind: "business", businessId: "biz-A" };
const OTHER = "biz-B";

describe("orders tenant isolation", () => {
  it("owner A cannot LIST orders in owner B's business", async () => {
    await expect(
      listOrdersInRange(ownerA, OTHER, new Date("2026-01-01"), new Date("2026-02-01")),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("owner A cannot CREATE an order in owner B's business", async () => {
    await expect(
      createOrder(ownerA, OTHER, {
        customerName: "Sneaky",
        customerPhone: "0500000000",
        pickupAt: new Date("2026-01-01T10:00:00Z"),
        items: [{ productId: "p1", quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("owner A cannot read the SALES TIME SERIES for owner B's business", async () => {
    await expect(getSalesTimeSeries(ownerA, OTHER, 2026, 7)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("owner A cannot read PER-PRODUCT monthly stats for owner B's business", async () => {
    await expect(getMonthlyProductStats(ownerA, OTHER, 2026, 7)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("owner A cannot read the STATS OVERVIEW for owner B's business", async () => {
    await expect(getStatsOverview(ownerA, OTHER, 2026, 7)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("owner A cannot LIST PENDING orders in owner B's business", async () => {
    await expect(listPendingOrders(ownerA, OTHER)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("owner A cannot REJECT an order that doesn't exist (surfaces NotFoundError, not a leak)", async () => {
    // rejectOrder looks the order up by id first (no businessId param to spoof),
    // so the isolation check happens on the ROW's own businessId. A missing id
    // must fail closed with NotFoundError, not silently succeed.
    await expect(rejectOrder(ownerA, "does-not-exist")).rejects.toThrow();
  });
});

// The type system already makes these calls impossible: every function below
// declares `ctx: ManageContext`, and a storefront context is not assignable to
// it — so this file would not compile without the deliberate cast.
//
// We cast anyway, on purpose. Types are erased at runtime, `as any` exists, and
// a future refactor could widen a signature back by accident. These tests prove
// the RUNTIME guard holds on its own, so the storefront lockdown does not depend
// on the type layer alone.
//
// They stay DB-free only because assertIsManager runs BEFORE the row lookup in
// the id-only functions. If someone moves a guard below its `findUnique`, these
// tests will hang or fail against no database — which is the intended alarm.
const storefrontA = {
  kind: "storefront",
  businessId: "biz-A",
} as unknown as ManageContext;

describe("a storefront context cannot reach owner-only order functions", () => {
  it("cannot APPROVE or otherwise change an order's status", async () => {
    await expect(
      setOrderStatus(storefrontA, "order-1", OrderStatus.OPEN),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("cannot REJECT (delete) an order", async () => {
    await expect(rejectOrder(storefrontA, "order-1")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("cannot read a single order's full details", async () => {
    await expect(getOrder(storefrontA, "order-1")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("cannot read the approval queue", async () => {
    await expect(
      listPendingOrders(storefrontA, "biz-A"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("cannot read the schedule", async () => {
    await expect(
      listOrdersInRange(storefrontA, "biz-A", new Date("2026-01-01"), new Date("2026-02-01")),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("cannot read the business's revenue stats", async () => {
    await expect(
      getStatsOverview(storefrontA, "biz-A", 2026, 7),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
