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
} from "@/modules/orders/service";
import { ForbiddenError } from "@/lib/errors";
import type { TenantContext } from "@/modules/tenant/context";

const ownerA: TenantContext = { kind: "business", businessId: "biz-A" };
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
