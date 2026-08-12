// Orders module — creating orders and reading them back for the schedule.
//
// Same isolation discipline as the rest of the app: every function takes a
// TenantContext and calls assertCanAccessBusiness before touching data. Orders
// are created manually by the owner for now (WhatsApp/phone); later the public
// storefront will call createOrder with the same shape.
import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertCanAccessBusiness, type TenantContext } from "@/modules/tenant/context";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { OrderStatus, InventoryMode } from "@/generated/prisma/enums";
import { lastMonths, monthRange } from "@/lib/schedule";

// ---- Validation ------------------------------------------------------------

export const CreateOrderInput = z.object({
  customerName: z.string().trim().min(1, { error: "Customer name is required." }).max(80),
  customerPhone: z.string().trim().min(3, { error: "Customer phone is required." }).max(30),
  // Accepts a Date or an ISO/`datetime-local` string and coerces to a Date.
  pickupAt: z.coerce.date({ error: "A valid pickup date & time is required." }),
  notes: z.string().trim().max(500).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z
          .number({ error: "Quantity is required." })
          .int()
          .min(1, { error: "Quantity must be at least 1." })
          .max(1000),
      }),
    )
    .min(1, { error: "An order needs at least one product." }),
});
export type CreateOrderInput = z.infer<typeof CreateOrderInput>;

// ---- Create ----------------------------------------------------------------

/**
 * Create an order for a business. We look up every referenced product SCOPED to
 * this business, which does two jobs at once:
 *   1. It stops an order from referencing another tenant's product.
 *   2. It gives us the authoritative name + price to SNAPSHOT onto each line, so
 *      later edits/deletes to the product never rewrite this order's history.
 *
 * Also advances the inventory-limit state machine: for any ordered product
 * currently LIMITED, this order's quantity is added to limitSoldCount, and if
 * that reaches limitMaxQuantity the product auto-flips to OUT_OF_STOCK. This
 * order itself is never blocked/rejected for exceeding the limit — the flip
 * only affects orders placed AFTER this one. Order + inventory updates happen
 * in one transaction so they can't drift apart on a partial failure.
 */
export async function createOrder(
  ctx: TenantContext,
  businessId: string,
  input: CreateOrderInput,
) {
  assertCanAccessBusiness(ctx, businessId);

  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await db.product.findMany({
    where: { id: { in: productIds }, businessId },
    select: {
      id: true,
      name: true,
      priceCents: true,
      inventoryMode: true,
      limitMaxQuantity: true,
      limitSoldCount: true,
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  // Every referenced product must exist AND belong to this business.
  const missing = productIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new ValidationError("One or more products are invalid for this business.");
  }

  const itemsData = input.items.map((i) => {
    const p = byId.get(i.productId)!;
    return {
      businessId,
      productId: p.id,
      nameSnapshot: p.name,
      priceCentsSnapshot: p.priceCents,
      quantity: i.quantity,
    };
  });

  // Sum quantity per product first — an order could list the same product
  // across more than one line.
  const orderedQtyByProduct = new Map<string, number>();
  for (const i of input.items) {
    orderedQtyByProduct.set(i.productId, (orderedQtyByProduct.get(i.productId) ?? 0) + i.quantity);
  }

  return db.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        businessId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        pickupAt: input.pickupAt,
        notes: input.notes ?? null,
        items: { create: itemsData },
      },
      include: { items: true },
    });

    for (const [productId, qty] of orderedQtyByProduct) {
      const p = byId.get(productId)!;
      if (p.inventoryMode !== InventoryMode.LIMITED) continue;
      const newSoldCount = p.limitSoldCount + qty;
      const exhausted = p.limitMaxQuantity !== null && newSoldCount >= p.limitMaxQuantity;
      await tx.product.update({
        where: { id: productId },
        data: {
          limitSoldCount: newSoldCount,
          ...(exhausted ? { inventoryMode: InventoryMode.OUT_OF_STOCK } : {}),
        },
      });
    }

    return order;
  });
}

// ---- Read ------------------------------------------------------------------

/**
 * Orders for a business whose pickup falls in [startInclusive, endExclusive).
 * This is what the schedule calls for each visible window. Ordered by pickup
 * time so the UI can bucket them by day in order.
 *
 * Excludes PENDING: a pending order isn't "on the schedule" yet — it only
 * shows up here once approved (PENDING → OPEN). Use listPendingOrders for the
 * approval queue instead.
 */
export async function listOrdersInRange(
  ctx: TenantContext,
  businessId: string,
  startInclusive: Date,
  endExclusive: Date,
) {
  assertCanAccessBusiness(ctx, businessId);
  return db.order.findMany({
    where: {
      businessId,
      status: { not: OrderStatus.PENDING },
      pickupAt: { gte: startInclusive, lt: endExclusive },
    },
    orderBy: { pickupAt: "asc" },
    include: {
      items: {
        select: { id: true, nameSnapshot: true, priceCentsSnapshot: true, quantity: true },
      },
    },
  });
}

/**
 * Orders awaiting the owner's approval (status PENDING) — the intake queue
 * shown in the schedule's sidebar. Not scoped by pickup date (a pending order
 * isn't "on the schedule" at all yet), just by business + status.
 */
export async function listPendingOrders(ctx: TenantContext, businessId: string) {
  assertCanAccessBusiness(ctx, businessId);
  return db.order.findMany({
    where: { businessId, status: OrderStatus.PENDING },
    orderBy: { pickupAt: "asc" },
    include: {
      items: {
        select: { id: true, nameSnapshot: true, priceCentsSnapshot: true, quantity: true },
      },
    },
  });
}

/**
 * Reject a pending order: unlike DONE (which stays visible, greyed), a
 * rejected order is actually deleted — it never made it onto the schedule.
 * OrderItem rows cascade-delete with it (see schema's onDelete: Cascade).
 */
export async function rejectOrder(ctx: TenantContext, orderId: string): Promise<void> {
  const existing = await db.order.findUnique({
    where: { id: orderId },
    select: { businessId: true },
  });
  if (!existing) throw new NotFoundError("Order not found.");
  assertCanAccessBusiness(ctx, existing.businessId);

  await db.order.delete({ where: { id: orderId } });
}

/** Full details for one order (for the click-to-expand card). */
export async function getOrder(ctx: TenantContext, orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        select: { id: true, nameSnapshot: true, priceCentsSnapshot: true, quantity: true },
      },
    },
  });
  if (!order) throw new NotFoundError("Order not found.");
  assertCanAccessBusiness(ctx, order.businessId);
  return order;
}

/**
 * Mark an order OPEN/DONE. A DONE order is NOT deleted — the schedule keeps
 * showing it (greyed), per the owner's request.
 */
export async function setOrderStatus(
  ctx: TenantContext,
  orderId: string,
  status: OrderStatus,
) {
  const existing = await db.order.findUnique({
    where: { id: orderId },
    select: { businessId: true },
  });
  if (!existing) throw new NotFoundError("Order not found.");
  assertCanAccessBusiness(ctx, existing.businessId);

  return db.order.update({
    where: { id: orderId },
    data: { status },
    select: { id: true, status: true },
  });
}

// ---- Stats -------------------------------------------------------------------
//
// "Counts as a sale" is defined ONCE here and reused by every aggregation below,
// so they can't quietly drift apart: an order counts once it's been approved
// (not PENDING), scoped by its PICKUP date. This mirrors listOrdersInRange's own
// exclusion — a pending order isn't on the schedule yet, so it shouldn't move
// revenue/KPIs before the owner approves it either.
const SALE_STATUS = { not: OrderStatus.PENDING } as const;

/** One month's totals — one point on the revenue chart. */
export type MonthPoint = {
  year: number;
  monthIndex: number; // 0-11
  revenueCents: number;
  orderCount: number;
  itemCount: number;
};

/**
 * Revenue/orders/items per month for `months` consecutive months ending at
 * (endYear, endMonthIndex) — the data behind the stats page's revenue chart.
 * One query over the whole window; months with no orders still appear as a
 * zero point (pre-seeded below) so the chart never has a silently-missing tick.
 */
export async function getSalesTimeSeries(
  ctx: TenantContext,
  businessId: string,
  endYear: number,
  endMonthIndex: number,
  months = 12,
): Promise<MonthPoint[]> {
  assertCanAccessBusiness(ctx, businessId);

  const window = lastMonths(endYear, endMonthIndex, months);
  const rangeStart = monthRange(window[0].year, window[0].monthIndex).start;
  const rangeEnd = monthRange(window.at(-1)!.year, window.at(-1)!.monthIndex).end;

  const orders = await db.order.findMany({
    where: { businessId, status: SALE_STATUS, pickupAt: { gte: rangeStart, lt: rangeEnd } },
    select: {
      pickupAt: true,
      items: { select: { priceCentsSnapshot: true, quantity: true } },
    },
  });

  const byKey = new Map<string, MonthPoint>(
    window.map(({ year, monthIndex }) => [
      `${year}-${monthIndex}`,
      { year, monthIndex, revenueCents: 0, orderCount: 0, itemCount: 0 },
    ]),
  );

  for (const order of orders) {
    const key = `${order.pickupAt.getFullYear()}-${order.pickupAt.getMonth()}`;
    const point = byKey.get(key);
    if (!point) continue; // outside the requested window; shouldn't happen given the query, but stay safe
    point.orderCount += 1;
    for (const line of order.items) {
      point.revenueCents += line.priceCentsSnapshot * line.quantity;
      point.itemCount += line.quantity;
    }
  }

  return window.map(({ year, monthIndex }) => byKey.get(`${year}-${monthIndex}`)!);
}

/** One product's performance inside a single month. */
export type ProductMonthStat = {
  productId: string | null; // null when the product row was later deleted (SetNull)
  key: string; // productId, or a name-based fallback for deleted products — stable React key
  name: string; // nameSnapshot at time of sale — the historically-correct label
  quantity: number;
  revenueCents: number;
  orderCount: number; // distinct orders this month that contained the product
  orderSharePct: number; // 0-100, rounded; 0 when the month has no orders at all
};

export type MonthlyProductStats = {
  orderCount: number; // the month's total order count (the % denominator above)
  products: ProductMonthStat[]; // revenue desc
};

/**
 * Per-product sales for one calendar month — the data behind the product
 * analytics grid. Groups by productId (falling back to nameSnapshot only for
 * orphaned lines whose product was deleted), NOT by name, so renaming a
 * product or two products sharing a name never merges/splits history.
 */
export async function getMonthlyProductStats(
  ctx: TenantContext,
  businessId: string,
  year: number,
  monthIndex: number,
): Promise<MonthlyProductStats> {
  assertCanAccessBusiness(ctx, businessId);

  const { start, end } = monthRange(year, monthIndex);
  const orders = await db.order.findMany({
    where: { businessId, status: SALE_STATUS, pickupAt: { gte: start, lt: end } },
    select: {
      id: true,
      items: { select: { productId: true, nameSnapshot: true, priceCentsSnapshot: true, quantity: true } },
    },
  });

  type Row = ProductMonthStat & { orderIds: Set<string> };
  const byKey = new Map<string, Row>();

  for (const order of orders) {
    for (const line of order.items) {
      const key = line.productId ?? `name:${line.nameSnapshot}`;
      const row =
        byKey.get(key) ??
        ({
          productId: line.productId,
          key,
          name: line.nameSnapshot,
          quantity: 0,
          revenueCents: 0,
          orderCount: 0,
          orderSharePct: 0,
          orderIds: new Set<string>(),
        } satisfies Row);
      row.quantity += line.quantity;
      row.revenueCents += line.priceCentsSnapshot * line.quantity;
      row.orderIds.add(order.id);
      byKey.set(key, row);
    }
  }

  const orderCount = orders.length;
  const products = [...byKey.values()]
    .map((row) => ({
      productId: row.productId,
      key: row.key,
      name: row.name,
      quantity: row.quantity,
      revenueCents: row.revenueCents,
      orderCount: row.orderIds.size,
      orderSharePct: orderCount === 0 ? 0 : Math.round((row.orderIds.size / orderCount) * 100),
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents);

  return { orderCount, products };
}

/** Everything the stats page needs for one selected month, in one call. */
export type StatsOverview = {
  series: MonthPoint[]; // oldest -> newest; the LAST entry is the selected month
  selected: MonthPoint;
  previous: MonthPoint | null; // null only if the series somehow has <2 points
  monthly: MonthlyProductStats;
  avgOrderValueCents: number; // selected month's revenue / selected month's orders; 0 if that month has no orders
  growthPct: number | null; // month-over-month revenue change; null when the previous month had 0 revenue (undefined growth)
};

/**
 * Composes getSalesTimeSeries + getMonthlyProductStats (run in parallel) plus
 * a few pure derived numbers (avg order value, month-over-month growth) into
 * everything the stats page renders. Guards up front too — defence in depth,
 * even though both calls it makes guard themselves.
 */
export async function getStatsOverview(
  ctx: TenantContext,
  businessId: string,
  year: number,
  monthIndex: number,
  months = 12,
): Promise<StatsOverview> {
  assertCanAccessBusiness(ctx, businessId);

  const [series, monthly] = await Promise.all([
    getSalesTimeSeries(ctx, businessId, year, monthIndex, months),
    getMonthlyProductStats(ctx, businessId, year, monthIndex),
  ]);

  const selected = series.at(-1)!;
  const previous = series.length > 1 ? series.at(-2)! : null;

  const avgOrderValueCents =
    selected.orderCount === 0 ? 0 : Math.round(selected.revenueCents / selected.orderCount);

  const growthPct =
    !previous || previous.revenueCents === 0
      ? null
      : Math.round(((selected.revenueCents - previous.revenueCents) / previous.revenueCents) * 100);

  return { series, selected, previous, monthly, avgOrderValueCents, growthPct };
}
