"use client";
// The checkout form. SHARED across every storefront template — nothing here is
// business-specific, so a new business gets checkout for free (see CLAUDE.md's
// rule about only forking genuinely bespoke pieces into src/storefronts/<name>/).
//
// What gets posted: the slug, the customer's details, and a JSON array of
// { productId, quantity }. Prices are NOT posted — they're display-only here and
// the server re-reads them from the database.
import { useEffect } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useCart } from "./cart-context";
import { submitCheckoutAction } from "@/modules/storefront/actions";
import type { CheckoutState, UnavailableLine } from "@/modules/storefront/checkout-types";
import { formatCents } from "@/lib/money";
import { Button } from "@/components/ui/button";

/** Today in the local YYYY-MM-DD form <input type="date" min> expects. */
function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function unavailableText(line: UnavailableLine, name: string): string {
  if (line.reason === "REMOVED") return `${name} — כבר לא זמין`;
  if (line.reason === "OUT_OF_STOCK") return `${name} — אזל מהמלאי`;
  if (line.availableQuantity === 0) return `${name} — אזל מהמלאי`;
  return `${name} — נותרו ${line.availableQuantity} בלבד`;
}

export function CheckoutForm({ businessName }: { businessName: string }) {
  const { lines, totalCents, clear, remove, setQty, slug } = useCart();
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(
    submitCheckoutAction,
    undefined,
  );

  // Empty the cart only AFTER the server confirmed the order. Done in an effect
  // (not inside the action) so the thank-you panel below can't render against a
  // stale cart.
  useEffect(() => {
    if (state?.status === "ok") clear();
  }, [state, clear]);

  if (state?.status === "ok") {
    return (
      <main className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center gap-4 px-5 py-16 text-center">
        <h1 className="text-2xl font-extrabold">ההזמנה נשלחה!</h1>
        <p className="text-ink/70">
          תודה שהזמנתם מ{businessName}. ההזמנה ממתינה לאישור, ונחזור אליכם לתיאום.
        </p>
        <Link href={`/${slug}`}>
          <Button size="lg">חזרה לחנות</Button>
        </Link>
      </main>
    );
  }

  if (lines.length === 0) {
    return (
      <main className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center gap-4 px-5 py-16 text-center">
        <h1 className="text-2xl font-extrabold">הסל ריק</h1>
        <p className="text-ink/70">אפשר להוסיף מוצרים ולחזור לכאן.</p>
        <Link href={`/${slug}`}>
          <Button size="lg">חזרה לחנות</Button>
        </Link>
      </main>
    );
  }

  const byId = new Map(lines.map((l) => [l.id, l]));

  /** Apply the server's verdict to the cart, only when the customer asks for it. */
  function reconcile(unavailable: UnavailableLine[]) {
    for (const line of unavailable) {
      if (line.availableQuantity <= 0) remove(line.productId);
      else setQty(line.productId, line.availableQuantity);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-5 py-8">
      <h1 className="text-2xl font-extrabold">סיום הזמנה</h1>
      <p className="mt-1 text-sm text-ink/60">{businessName}</p>

      {/* Order summary — display only. */}
      <section className="mt-6 rounded-2xl bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">ההזמנה שלי</h2>
          <Link href={`/${slug}`} className="text-sm text-accent underline">
            עריכת הסל
          </Link>
        </div>
        <ul className="mt-3 space-y-2">
          {lines.map((line) => (
            <li key={line.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate">
                {line.name} × {line.quantity}
              </span>
              <span className="tabular-nums text-ink/70">
                {formatCents(line.priceCents * line.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 font-bold">
          <span>סה״כ</span>
          <span className="tabular-nums">{formatCents(totalCents)}</span>
        </div>
      </section>

      {state?.status === "unavailable" && (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm"
        >
          <p className="font-bold">{state.message}</p>
          <ul className="mt-2 list-disc space-y-1 pe-5">
            {state.lines.map((line) => (
              <li key={line.productId}>
                {unavailableText(line, byId.get(line.productId)?.name ?? "פריט")}
              </li>
            ))}
          </ul>
          {/* The cart is never silently changed — the customer consents first. */}
          <Button
            type="button"
            size="sm"
            className="mt-3"
            onClick={() => reconcile(state.lines)}
          >
            עדכן את הסל והמשך
          </Button>
        </div>
      )}

      {state?.status === "error" && (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm font-semibold"
        >
          {state.message}
        </p>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="slug" value={slug} />
        {/* Only ids and quantities. No prices, no business id, no status. */}
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(lines.map((l) => ({ productId: l.id, quantity: l.quantity })))}
        />

        <div>
          <label htmlFor="customerName" className="block text-sm font-semibold">
            שם מלא
          </label>
          <input
            id="customerName"
            name="customerName"
            required
            autoComplete="name"
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5"
          />
        </div>

        <div>
          <label htmlFor="customerPhone" className="block text-sm font-semibold">
            טלפון
          </label>
          {/* dir="ltr" on the CONTROL only: the page is RTL, but a phone number
              and the native date/time pickers below read left-to-right. */}
          <input
            id="customerPhone"
            name="customerPhone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            required
            autoComplete="tel"
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-start"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pickupDate" className="block text-sm font-semibold">
              תאריך איסוף
            </label>
            <input
              id="pickupDate"
              name="pickupDate"
              type="date"
              required
              min={todayISO()}
              dir="ltr"
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-start"
            />
          </div>
          <div>
            <label htmlFor="pickupTime" className="block text-sm font-semibold">
              שעת איסוף
            </label>
            <input
              id="pickupTime"
              name="pickupTime"
              type="time"
              required
              dir="ltr"
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-start"
            />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-semibold">
            הערות (לא חובה)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={500}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5"
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "שולח…" : "שליחת ההזמנה"}
        </Button>
        <p className="text-center text-xs text-ink/60">
          ההזמנה ממתינה לאישור בעל העסק. נחזור אליכם לתיאום.
        </p>
      </form>
    </main>
  );
}
