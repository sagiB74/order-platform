"use client";
// The persistent cart indicator: a sticky bottom banner that appears the moment
// the cart has at least one item, and a slide-up sheet to review/adjust the order.
// "המשך להזמנה" navigates to /[slug]/checkout, which is where the order is
// actually submitted (see components/cart/checkout-form.tsx).
import { useState } from "react";
import Link from "next/link";
import { useCart } from "./cart-context";
import { formatCents } from "@/lib/money";

export function CartBar() {
  const { lines, count, totalCents, setQty, slug } = useCart();
  const [open, setOpen] = useState(false);

  if (count === 0) return null;

  return (
    <>
      {/* Sticky banner */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center bg-gradient-to-t from-ground to-transparent p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full max-w-2xl items-center gap-4 rounded-2xl bg-accent px-5 py-4 font-bold text-white shadow-lg transition-colors hover:bg-accent-strong"
        >
          <span className="opacity-90">{count} פריטים</span>
          <span className="flex-1 text-center">צפייה בהזמנה</span>
          <span className="tabular-nums">{formatCents(totalCents)}</span>
        </button>
      </div>

      {/* Slide-up sheet */}
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="סגירה"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-ink/50"
          />
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-t-3xl bg-surface shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-lg font-extrabold">ההזמנה שלי</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="סגירה"
                className="grid h-9 w-9 place-items-center rounded-full border border-border text-ink hover:bg-surface-2"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5">
              {lines.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{l.name}</div>
                    <div className="text-sm text-ink-soft tabular-nums">
                      {formatCents(l.priceCents)} ליחידה
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQty(l.id, l.quantity - 1)}
                      aria-label="הפחתה"
                      className="h-8 w-8 rounded-lg border border-border text-lg font-bold leading-none hover:border-accent hover:text-accent"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-bold tabular-nums">{l.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQty(l.id, l.quantity + 1)}
                      aria-label="הוספה"
                      className="h-8 w-8 rounded-lg border border-border text-lg font-bold leading-none hover:border-accent hover:text-accent"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="mb-3 flex justify-between text-lg font-extrabold tabular-nums">
                <span>סה״כ</span>
                <span>{formatCents(totalCents)}</span>
              </div>
              <Link
                href={`/${slug}/checkout`}
                onClick={() => setOpen(false)}
                className="block w-full rounded-2xl bg-accent py-4 text-center text-base font-extrabold text-white transition-colors hover:bg-accent-strong"
              >
                המשך להזמנה
              </Link>
              <p className="mt-3 text-center text-xs text-ink-soft">
                איסוף עצמי · בחירת מועד בעמוד הבא
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
