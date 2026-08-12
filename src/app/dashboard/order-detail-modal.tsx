"use client";
// Full order details, opened by clicking a today/week order (image tile in
// the spec's terms — here, clicking anywhere on the compact card except the
// status pill). Includes the same mark-done/reopen toggle the old inline
// expand used to have, now inside a modal instead.
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/money";
import { whatsappLink } from "@/lib/phone";
import { markOrderStatusAction } from "./actions";
import type { OrderSummary } from "./schedule-types";

export function OrderDetailModal({
  order,
  onClose,
}: {
  order: OrderSummary | null;
  onClose: () => void;
}) {
  return (
    <Modal open={order !== null} onClose={onClose}>
      {order && (
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xl font-extrabold text-ink">{order.customerName}</h3>
            <span
              className={
                order.status === "DONE"
                  ? "shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-ink-soft"
                  : "shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent"
              }
            >
              {order.status === "DONE" ? "בוצע" : "פתוח"}
            </span>
          </div>
          <div className="mt-1 text-sm text-ink-soft">
            {order.dateLabel} · {order.time}
          </div>

          <a
            href={whatsappLink(order.customerPhone)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
          >
            {order.customerPhone} (וואטסאפ)
          </a>

          <ul className="mt-4 flex flex-col gap-1 border-t border-border pt-3">
            {order.items.map((i) => (
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
            <span className="tabular-nums">{formatCents(order.totalCents)}</span>
          </div>

          {order.notes && (
            <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink">
              📝 {order.notes}
            </p>
          )}

          <form action={markOrderStatusAction} className="mt-5">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="done" value={(order.status !== "DONE").toString()} />
            <Button
              type="submit"
              variant={order.status === "DONE" ? "secondary" : "primary"}
              className="w-full"
            >
              {order.status === "DONE" ? "פתיחה מחדש" : "סימון כבוצע"}
            </Button>
          </form>
        </div>
      )}
    </Modal>
  );
}
