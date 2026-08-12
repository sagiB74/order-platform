"use client";
// Modal body for one product's monthly numbers. Same interaction pattern as
// order-detail-modal.tsx / the products page's limit modal: reuses the shared
// Modal shell, this file is just its content.
import { Modal } from "@/components/ui/modal";
import type { ProductAnalyticsItem } from "./stats-types";

export function ProductStatModal({
  item,
  monthLabel,
  onClose,
}: {
  item: ProductAnalyticsItem | null;
  monthLabel: string;
  onClose: () => void;
}) {
  return (
    <Modal open={item !== null} onClose={onClose} labelledBy="product-stat-title">
      {item && (
        <div>
          <h2 id="product-stat-title" className="pe-8 text-lg font-extrabold text-ink">
            {item.name}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">נתונים עבור {monthLabel}</p>

          <dl className="mt-5 grid grid-cols-3 gap-3">
            <Stat label="כמות שנמכרה" value={String(item.quantitySold)} />
            <Stat label="הכנסות" value={item.revenueLabel} />
            <Stat label="אחוז מההזמנות" value={`${item.orderSharePct}%`} />
          </dl>

          {item.description && <p className="mt-4 text-sm text-ink-soft">{item.description}</p>}
        </div>
      )}
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3 text-center">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="mt-1 text-lg font-bold tabular-nums text-ink">{value}</dd>
    </div>
  );
}
