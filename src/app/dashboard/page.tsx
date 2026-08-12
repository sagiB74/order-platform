// Business owner home = the SCHEDULE (לו"ז). Fetches everything the schedule's
// client shell needs in one pass: the pending-approval queue, the next 7 days
// of orders (powers both the "today" and "week" bottom-nav views — same fetch,
// pure client-side view switch, no extra round trip), and the current year's
// orders bucketed into a 12-month grid for the "כל ההזמנות" calendar modal.
// Everything is loaded through the tenant-guarded orders service, scoped to
// this owner's own businessId.
import { requireTenantContext } from "@/lib/dal";
import { listOrdersInRange, listPendingOrders } from "@/modules/orders/service";
import { weekWindow, monthWindow, dayKey, formatDayHeading, formatMonthLabel, formatTime } from "@/lib/schedule";
import { ScheduleClient } from "./schedule-client";
import type { OrderSummary, DayBucket, MonthGrid } from "./schedule-types";

type LoadedOrder = Awaited<ReturnType<typeof listOrdersInRange>>[number];

function toSummary(o: LoadedOrder): OrderSummary {
  const items = o.items.map((i) => ({
    id: i.id,
    name: i.nameSnapshot,
    quantity: i.quantity,
    priceCents: i.priceCentsSnapshot,
  }));
  const totalCents = items.reduce((s, i) => s + i.priceCents * i.quantity, 0);
  return {
    id: o.id,
    time: formatTime(o.pickupAt),
    dateKey: dayKey(o.pickupAt),
    dateLabel: formatDayHeading(o.pickupAt),
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    status: o.status,
    notes: o.notes,
    items,
    totalCents,
  };
}

export default async function DashboardPage() {
  // Role/tenant gate for this whole /dashboard/* tree lives in layout.tsx now.
  const { user, ctx } = await requireTenantContext();
  const businessId = user.businessId!;

  const week = weekWindow();
  const now = new Date();
  const year = now.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const [pending, weekOrders, yearOrders] = await Promise.all([
    listPendingOrders(ctx, businessId),
    listOrdersInRange(ctx, businessId, week.rangeStart, week.rangeEnd),
    listOrdersInRange(ctx, businessId, yearStart, yearEnd),
  ]);

  const pendingOrders: OrderSummary[] = pending.map(toSummary);

  const weekByDay = new Map<string, OrderSummary[]>();
  for (const o of weekOrders) {
    const s = toSummary(o);
    (weekByDay.get(s.dateKey) ?? weekByDay.set(s.dateKey, []).get(s.dateKey)!).push(s);
  }
  const weekDays: DayBucket[] = week.days.map((d) => ({
    dateKey: dayKey(d),
    dateLabel: formatDayHeading(d),
    orders: weekByDay.get(dayKey(d)) ?? [],
  }));

  const yearByDay = new Map<string, OrderSummary[]>();
  for (const o of yearOrders) {
    const s = toSummary(o);
    (yearByDay.get(s.dateKey) ?? yearByDay.set(s.dateKey, []).get(s.dateKey)!).push(s);
  }
  const yearMonths: MonthGrid[] = Array.from({ length: 12 }, (_, monthIndex) => {
    const win = monthWindow(year, monthIndex);
    return {
      year,
      monthIndex,
      label: formatMonthLabel(year, monthIndex),
      weeks: win.weeks.map((week) =>
        week.map((date) => ({
          dateKey: dayKey(date),
          dayNum: date.getDate(),
          inMonth: date.getMonth() === monthIndex,
          orders: yearByDay.get(dayKey(date)) ?? [],
        })),
      ),
    };
  });

  return <ScheduleClient pendingOrders={pendingOrders} weekDays={weekDays} yearMonths={yearMonths} />;
}
