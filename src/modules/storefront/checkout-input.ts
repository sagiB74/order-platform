// Validation for the PUBLIC checkout payload.
//
// Kept separate from the orders service's CreateOrderInput on purpose: this is
// the anonymous, internet-facing edge, and it needs rules the owner's own
// "add order" form must NOT have (a customer can only book the future; the owner
// backfills past orders, and the history seed depends on that).
//
// Pure — no DB, no server-only — so every rule below is unit-testable.
import { z } from "zod";

/** Caps that bound how much work one anonymous request can ask for. */
export const MAX_CHECKOUT_LINES = 40;
export const MAX_LINE_QUANTITY = 50;
export const MAX_PICKUP_DAYS_AHEAD = 90;

/**
 * What a customer may send.
 *
 * SECURITY: note what is NOT here — no priceCents, no businessId, no status, no
 * total. zod strips unknown keys, so those are dropped before the service is
 * reached; they are not "rejected", they simply cease to exist. Prices are
 * re-read from the database (see modules/orders/pricing.ts), the business comes
 * from the URL slug resolved server-side, and the status is derived from the
 * tenant context. None of the three can be influenced from the client.
 */
export const PublicCheckoutInput = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, { error: "נא למלא שם מלא." })
    .max(80, { error: "השם ארוך מדי." }),
  customerPhone: z
    .string()
    .trim()
    .min(9, { error: "נא למלא מספר טלפון." })
    .max(20, { error: "מספר הטלפון ארוך מדי." })
    .refine((v) => v.replace(/\D/g, "").length >= 9, {
      error: "מספר הטלפון אינו תקין.",
    }),
  // From <input type="date"> and <input type="time"> — two controls rather than
  // one datetime-local, which renders inconsistently in Hebrew on mobile.
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "נא לבחור תאריך איסוף." }),
  pickupTime: z.string().regex(/^\d{2}:\d{2}$/, { error: "נא לבחור שעת איסוף." }),
  notes: z.string().trim().max(500, { error: "ההערה ארוכה מדי." }).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1).max(40),
        quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
      }),
    )
    .min(1, { error: "הסל ריק." })
    .max(MAX_CHECKOUT_LINES, { error: "יותר מדי פריטים שונים בסל." }),
});
export type PublicCheckoutInput = z.infer<typeof PublicCheckoutInput>;

export type ResolvedPickup =
  | { ok: true; pickupAt: Date }
  | { ok: false; message: string };

/**
 * Combine the date + time fields into a single Date, then range-check it.
 *
 * Interpreted in the SERVER's local timezone, which is the same assumption
 * src/lib/schedule.ts already makes for the owner's schedule — so a pickup the
 * customer picks and the slot the owner sees agree. (Business.timezone exists in
 * the schema for when this app goes multi-region; that migration should change
 * both places together.)
 *
 * `now` is a parameter so the boundary cases are testable without mocking time.
 */
export function resolvePickupAt(date: string, time: string, now: Date): ResolvedPickup {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  if (
    year === undefined || month === undefined || day === undefined ||
    hour === undefined || minute === undefined ||
    [year, month, day, hour, minute].some((n) => !Number.isFinite(n))
  ) {
    return { ok: false, message: "תאריך או שעת איסוף אינם תקינים." };
  }

  const pickupAt = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(pickupAt.getTime())) {
    return { ok: false, message: "תאריך או שעת איסוף אינם תקינים." };
  }

  // Reject a rolled-over date (e.g. "2026-02-31" becoming March 3rd) rather than
  // silently booking a different day than the customer chose.
  if (
    pickupAt.getFullYear() !== year ||
    pickupAt.getMonth() !== month - 1 ||
    pickupAt.getDate() !== day
  ) {
    return { ok: false, message: "תאריך האיסוף אינו קיים." };
  }

  if (pickupAt.getTime() <= now.getTime()) {
    return { ok: false, message: "יש לבחור מועד איסוף עתידי." };
  }

  const latest = new Date(now.getTime());
  latest.setDate(latest.getDate() + MAX_PICKUP_DAYS_AHEAD);
  if (pickupAt.getTime() > latest.getTime()) {
    return { ok: false, message: `ניתן להזמין עד ${MAX_PICKUP_DAYS_AHEAD} ימים מראש.` };
  }

  return { ok: true, pickupAt };
}
