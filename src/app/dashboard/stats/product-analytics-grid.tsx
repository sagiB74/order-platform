"use client";
// Same grouped-by-category grid layout as the products page, but cards are
// clickable — opening a modal with this month's numbers for that product
// instead of an inventory control.
import { useState } from "react";
import type { ProductAnalyticsItem, ProductGroup } from "./stats-types";
import { ProductStatModal } from "./product-stat-modal";

export function ProductAnalyticsGrid({
  groups,
  monthLabel,
}: {
  groups: ProductGroup[];
  monthLabel: string;
}) {
  const [selected, setSelected] = useState<ProductAnalyticsItem | null>(null);

  return (
    <>
      <div className="mt-6 flex flex-col gap-10">
        {groups.map((group) => (
          <section key={group.key}>
            <div className="mb-3 flex items-center gap-2.5">
              <h3 className="text-sm font-bold uppercase tracking-wide text-ink-soft">
                {group.name}
              </h3>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-ink-soft">
                {group.items.length}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="flex h-full cursor-pointer flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-start shadow-sm transition-colors hover:bg-surface-2"
                >
                  <h4 className="truncate font-bold text-ink">{item.name}</h4>
                  <div className="text-sm font-semibold tabular-nums text-accent">
                    {item.priceLabel}
                  </div>
                  <div className="mt-auto text-xs text-ink-soft">{item.quantitySold} נמכרו החודש</div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <ProductStatModal item={selected} monthLabel={monthLabel} onClose={() => setSelected(null)} />
    </>
  );
}
