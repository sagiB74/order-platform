"use client";
// The approval queue. Slim cards; clicking one opens a modal with the full
// order + Approve ("אשר" — PENDING → OPEN, so it now shows up on the
// schedule) / Reject ("סרב" — deletes it outright) / X (just closes, no
// change). Selection is tracked by id, not the order object itself, so the
// modal always reflects fresh data after an approve/reject revalidates.
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/money";
import { approveOrderAction, rejectOrderAction } from "./actions";
import type { OrderSummary } from "./schedule-types";

export function PendingSidebar({ orders }: { orders: OrderSummary[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = orders.find((o) => o.id === selectedId) ?? null;

  return (
    <aside className="flex flex-col gap-2">
      <h2 className="text-sm font-extrabold text-ink-soft">ממתינות לאישור</h2>
      {orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-ink-soft">
          אין הזמנות ממתינות
        </p>
      ) : (
        orders.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setSelectedId(o.id)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-start text-sm hover:border-accent"
          >
            <div className="flex items-center justify-between gap-2 font-bold text-ink">
              <span className="truncate">{o.customerName}</span>
              <span className="shrink-0 tabular-nums text-xs text-ink-soft">{o.time}</span>
            </div>
            <div className="mt-0.5 text-xs text-ink-soft">{o.dateLabel}</div>
          </button>
        ))
      )}

      <Modal open={selected !== null} onClose={() => setSelectedId(null)}>
        {selected && (
          <div>
            <h3 className="text-xl font-extrabold text-ink">{selected.customerName}</h3>
            <div className="mt-1 text-sm text-ink-soft">
              {selected.dateLabel} · {selected.time}
            </div>
            <div className="mt-1 text-sm text-ink-soft">{selected.customerPhone}</div>

            <ul className="mt-4 flex flex-col gap-1 border-t border-border pt-3">
              {selected.items.map((i) => (
                <li key={i.id} className="flex justify-between text-sm">
                  <span>
                    {i.quantity} × {i.name}
                  </span>
                  <span className="tabular-nums text-ink-soft">
                    {formatCents(i.priceCents * i.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-bold text-ink">
              <span>סה״כ</span>
              <span className="tabular-nums">{formatCents(selected.totalCents)}</span>
            </div>

            {selected.notes && (
              <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink">
                📝 {selected.notes}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <form action={approveOrderAction} className="flex-1" onSubmit={() => setSelectedId(null)}>
                <input type="hidden" name="orderId" value={selected.id} />
                <Button type="submit" className="w-full">
                  אשר
                </Button>
              </form>
              <form action={rejectOrderAction} className="flex-1" onSubmit={() => setSelectedId(null)}>
                <input type="hidden" name="orderId" value={selected.id} />
                <button
                  type="submit"
                  className="w-full rounded-xl border border-danger px-4 py-2.5 text-sm font-semibold text-danger hover:bg-danger/10"
                >
                  סרב
                </button>
              </form>
            </div>
          </div>
        )}
      </Modal>
    </aside>
  );
}
