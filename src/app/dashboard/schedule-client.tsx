"use client";
// The schedule's interactive shell: bottom-nav view switch (היום / שבוע קרוב /
// כל ההזמנות), today's compact cards, the week grid, and orchestrates the 3
// modals (order details, pending approval — inside PendingSidebar — and the
// yearly calendar). All data is fetched once on the server and passed in;
// switching היום/שבוע קרוב is pure client state (both draw from the same
// already-fetched week of orders), so no extra round-trip.
import { useState } from "react";
import Link from "next/link";
import { markOrderStatusAction } from "./actions";
import { PendingSidebar } from "./pending-sidebar";
import { OrderDetailModal } from "./order-detail-modal";
import { AllOrdersModal } from "./all-orders-modal";
import type { OrderSummary, DayBucket, MonthGrid } from "./schedule-types";

export function ScheduleClient({
  pendingOrders,
  weekDays,
  yearMonths,
}: {
  pendingOrders: OrderSummary[];
  weekDays: DayBucket[]; // 7 entries, today first
  yearMonths: MonthGrid[];
}) {
  const [view, setView] = useState<"today" | "week">("today");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const today = weekDays[0];
  const selectedOrder =
    weekDays.flatMap((d) => d.orders).find((o) => o.id === selectedOrderId) ?? null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-ink">
          {view === "today" ? "הזמנות להיום" : "הזמנות לשבוע הקרוב"}
        </h1>
        <Link
          href="/dashboard/orders/new"
          className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent-strong"
        >
          + הוספת הזמנה
        </Link>
      </div>

      {/* Main area (right, RTL) + pending sidebar (left, RTL) */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          {view === "today" ? (
            <div className="flex flex-col gap-2">
              {today.orders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-ink-soft">
                  אין הזמנות היום
                </p>
              ) : (
                today.orders.map((o) => (
                  <TodayOrderCard key={o.id} order={o} onOpen={() => setSelectedOrderId(o.id)} />
                ))
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid min-w-[50rem] grid-cols-7 gap-2">
                {weekDays.map((day) => (
                  <div key={day.dateKey} className="rounded-xl border border-border bg-surface p-2">
                    <div className="mb-2 text-center text-xs font-bold text-ink-soft">
                      {day.dateLabel}
                    </div>
                    <div className="flex flex-col gap-1">
                      {day.orders.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border py-3 text-center text-[11px] text-ink-soft">
                          —
                        </div>
                      ) : (
                        day.orders.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setSelectedOrderId(o.id)}
                            className={`truncate rounded-lg px-1.5 py-1 text-start text-[11px] ${
                              o.status === "DONE"
                                ? "bg-surface-2 text-ink-soft line-through"
                                : "bg-accent/10 text-accent hover:bg-accent/20"
                            }`}
                          >
                            {o.time} {o.customerName}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <PendingSidebar orders={pendingOrders} />
      </div>

      {/* Bottom nav — 3 buttons under the cards */}
      <div className="mt-8 inline-flex rounded-xl border border-border bg-surface p-1 text-sm">
        <button
          type="button"
          onClick={() => setView("today")}
          className={
            view === "today"
              ? "rounded-lg bg-accent px-4 py-2 font-bold text-white"
              : "rounded-lg px-4 py-2 font-semibold text-ink hover:bg-surface-2"
          }
        >
          היום
        </button>
        <button
          type="button"
          onClick={() => setView("week")}
          className={
            view === "week"
              ? "rounded-lg bg-accent px-4 py-2 font-bold text-white"
              : "rounded-lg px-4 py-2 font-semibold text-ink hover:bg-surface-2"
          }
        >
          שבוע קרוב
        </button>
        <button
          type="button"
          onClick={() => setCalendarOpen(true)}
          className="rounded-lg px-4 py-2 font-semibold text-ink hover:bg-surface-2"
        >
          כל ההזמנות
        </button>
      </div>

      <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrderId(null)} />
      <AllOrdersModal open={calendarOpen} onClose={() => setCalendarOpen(false)} months={yearMonths} />
    </div>
  );
}

function TodayOrderCard({ order, onOpen }: { order: OrderSummary; onOpen: () => void }) {
  const done = order.status === "DONE";
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
        done ? "border-border bg-surface-2/50" : "border-border bg-surface hover:border-accent"
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-start"
      >
        <span className={`tabular-nums text-sm font-bold ${done ? "text-ink-soft" : "text-ink"}`}>
          {order.time}
        </span>
        <span className={`truncate font-semibold ${done ? "text-ink-soft line-through" : "text-ink"}`}>
          {order.customerName}
        </span>
        <span className="truncate text-xs text-ink-soft">{order.customerPhone}</span>
      </button>
      {/* The status pill IS the clickable toggle — a sibling of the "open
          details" button above, not nested inside it, so no click ever needs
          to be suppressed from bubbling into the other. */}
      <form action={markOrderStatusAction}>
        <input type="hidden" name="orderId" value={order.id} />
        <input type="hidden" name="done" value={(!done).toString()} />
        <button
          type="submit"
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
            done
              ? "bg-surface-2 text-ink-soft hover:bg-border"
              : "bg-accent/10 text-accent hover:bg-accent hover:text-white"
          }`}
        >
          {done ? "בוצע" : "פתוח"}
        </button>
      </form>
    </div>
  );
}
