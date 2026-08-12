"use client";
// The manual order form. Customer details + pickup time on top, then the product
// list with a quantity per product. A running total updates as you type. On
// submit it posts to createOrderAction, which builds the order from every
// `qty_<id>` input that's greater than zero.
import { useState } from "react";
import { useActionState } from "react";
import { createOrderAction, type CreateOrderState } from "../actions";
import { formatCents } from "@/lib/money";

type ProductOption = {
  id: string;
  name: string;
  priceCents: number;
  categoryName: string | null;
};

const inputClass =
  "rounded-md border border-black/15 bg-white px-3 py-2 text-black outline-none focus:border-black/40 dark:border-white/20 dark:bg-zinc-900 dark:text-white";

export function AddOrderForm({ products }: { products: ProductOption[] }) {
  const [state, action, pending] = useActionState<CreateOrderState, FormData>(
    createOrderAction,
    undefined,
  );

  // Quantities live in client state so we can show a running total. They're also
  // submitted as real <input> values, so the server gets them either way.
  const [qty, setQty] = useState<Record<string, number>>({});
  const setQuantity = (id: string, value: string) => {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    setQty((prev) => ({ ...prev, [id]: n }));
  };

  const totalCents = products.reduce((sum, p) => sum + (qty[p.id] || 0) * p.priceCents, 0);
  const hasItems = products.some((p) => (qty[p.id] || 0) > 0);

  // Group products by category for a tidier list.
  const groups: { name: string; items: ProductOption[] }[] = [];
  for (const p of products) {
    const name = p.categoryName ?? "Other";
    let g = groups.find((x) => x.name === name);
    if (!g) {
      g = { name, items: [] };
      groups.push(g);
    }
    g.items.push(p);
  }

  return (
    <form action={action} className="mt-6 flex flex-col gap-6">
      {/* Customer + pickup */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Customer name</span>
          <input name="customerName" required placeholder="Dana Levi" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Phone</span>
          <input
            name="customerPhone"
            required
            inputMode="tel"
            placeholder="050-123-4567"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Pickup date &amp; time</span>
          <input name="pickupAt" type="datetime-local" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Notes (optional)</span>
          <input name="notes" placeholder="Nut allergy…" className={inputClass} />
        </label>
      </div>

      {/* Products with quantities */}
      <div className="rounded-xl border border-black/10 dark:border-white/10">
        <div className="border-b border-black/10 px-4 py-2 text-sm font-semibold dark:border-white/10">
          Items
        </div>
        <div className="flex flex-col">
          {groups.map((group) => (
            <div key={group.name}>
              <div className="bg-black/[0.02] px-4 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-white/[0.03]">
                {group.name}
              </div>
              {group.items.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-2 last:border-b-0 dark:border-white/5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-zinc-500">{formatCents(p.priceCents)}</div>
                  </div>
                  <input
                    type="number"
                    name={`qty_${p.id}`}
                    min={0}
                    value={qty[p.id] ? String(qty[p.id]) : ""}
                    onChange={(e) => setQuantity(p.id, e.target.value)}
                    placeholder="0"
                    className={`${inputClass} w-20 text-center`}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-black/10 px-4 py-3 font-medium dark:border-white/10">
          <span>Total</span>
          <span className="tabular-nums">{formatCents(totalCents)}</span>
        </div>
      </div>

      {state?.ok === false && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || !hasItems}
        className="rounded-md bg-black px-4 py-2.5 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {pending ? "Saving…" : "Save order"}
      </button>
      {!hasItems && (
        <p className="-mt-3 text-xs text-zinc-500">Add at least one product to save.</p>
      )}
    </form>
  );
}
