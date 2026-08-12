"use client";
// "כל ההזמנות" — a dismissable overlay with the current year's 12 months as
// small calendars; days with orders are highlighted and clickable, showing
// that day's orders INLINE within the same modal. All local state — never
// navigates or changes the underlying page, per spec.
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { formatCents } from "@/lib/money";
import type { MonthGrid, OrderSummary } from "./schedule-types";

type SelectedDay = { label: string; orders: OrderSummary[] };

export function AllOrdersModal({
  open,
  onClose,
  months,
}: {
  open: boolean;
  onClose: () => void;
  months: MonthGrid[];
}) {
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);

  const close = () => {
    onClose();
    setSelectedDay(null);
  };

  return (
    <Modal open={open} onClose={close}>
      <h3 className="text-xl font-extrabold text-ink">כל ההזמנות</h3>

      {selectedDay ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setSelectedDay(null)}
            className="text-sm font-semibold text-accent hover:underline"
          >
            → חזרה ללוח השנה
          </button>
          <h4 className="mt-2 font-bold text-ink">{selectedDay.label}</h4>
          {selectedDay.orders.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">אין הזמנות ביום זה</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {selectedDay.orders.map((o) => (
                <li key={o.id} className="rounded-xl border border-border p-2 text-sm">
                  <div className="flex justify-between font-semibold text-ink">
                    <span>{o.customerName}</span>
                    <span className="tabular-nums">{o.time}</span>
                  </div>
                  <div className="mt-0.5 text-xs tabular-nums text-ink-soft">
                    {formatCents(o.totalCents)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {months.map((m) => (
            <div key={`${m.year}-${m.monthIndex}`} className="rounded-xl border border-border p-2">
              <div className="mb-1 text-center text-xs font-bold text-ink-soft">{m.label}</div>
              <div className="grid grid-cols-7 gap-0.5">
                {m.weeks.flat().map((day) => {
                  const hasOrders = day.orders.length > 0;
                  return (
                    <button
                      key={day.dateKey}
                      type="button"
                      disabled={!day.inMonth || !hasOrders}
                      onClick={() =>
                        setSelectedDay({ label: `${m.label} ${day.dayNum}`, orders: day.orders })
                      }
                      className={`aspect-square rounded text-[10px] tabular-nums ${
                        !day.inMonth
                          ? "text-transparent"
                          : hasOrders
                            ? "bg-accent font-bold text-white hover:bg-accent-strong"
                            : "text-ink-soft"
                      }`}
                    >
                      {day.dayNum}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
