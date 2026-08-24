"use server";
// The PUBLIC checkout endpoint — the one write an anonymous visitor can reach.
//
// Everything that decides authority is resolved on the server:
//   - the BUSINESS comes from the URL slug (public data), never from the form;
//   - the tenant CONTEXT is minted only by resolveStorefront();
//   - the order STATUS is derived from that context (storefront -> PENDING), so
//     there is no field a client could send to skip the owner's approval queue;
//   - PRICES are re-read from the database inside createOrder, so the cart in
//     localStorage cannot influence what anything costs.
//
// See src/modules/storefront/checkout-input.ts for what a customer may send —
// notably, priceCents/businessId/status are not in that schema at all.
import { revalidatePath } from "next/cache";
import { AppError, InventoryUnavailableError } from "@/lib/errors";
import { createOrder } from "@/modules/orders/service";
import { resolveStorefront } from "@/modules/storefront/service";
import { PublicCheckoutInput, resolvePickupAt } from "@/modules/storefront/checkout-input";
import type { CheckoutState } from "@/modules/storefront/checkout-types";

export async function submitCheckoutAction(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const slug = (formData.get("slug") ?? "").toString().trim();
  if (!slug) return { status: "error", message: "החנות לא נמצאה." };

  // The ONLY place a businessId enters this request. A suspended or unknown
  // business resolves to null, closing checkout along with the storefront.
  const resolved = await resolveStorefront(slug);
  if (!resolved) return { status: "error", message: "החנות לא נמצאה." };

  let rawItems: unknown;
  try {
    rawItems = JSON.parse((formData.get("items") ?? "[]").toString());
  } catch {
    return { status: "error", message: "אירעה שגיאה בקריאת הסל. נסו לרענן את הדף." };
  }

  const parsed = PublicCheckoutInput.safeParse({
    customerName: (formData.get("customerName") ?? "").toString(),
    customerPhone: (formData.get("customerPhone") ?? "").toString(),
    pickupDate: (formData.get("pickupDate") ?? "").toString(),
    pickupTime: (formData.get("pickupTime") ?? "").toString(),
    notes: (formData.get("notes") ?? "").toString().trim() || undefined,
    items: rawItems,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "אחד מהפרטים אינו תקין.",
    };
  }

  const pickup = resolvePickupAt(parsed.data.pickupDate, parsed.data.pickupTime, new Date());
  if (!pickup.ok) return { status: "error", message: pickup.message };

  try {
    const order = await createOrder(resolved.ctx, resolved.businessId, {
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      pickupAt: pickup.pickupAt,
      notes: parsed.data.notes,
      items: parsed.data.items,
    });

    // A sold-out flip from this order must reach the catalog page.
    revalidatePath(`/${slug}`);

    // No redirect(): the client needs this state in order to clear the
    // localStorage cart before it renders the thank-you panel.
    return { status: "ok", orderId: order.id };
  } catch (err) {
    if (err instanceof InventoryUnavailableError) {
      return {
        status: "unavailable",
        message: "חלק מהפריטים בסל כבר לא זמינים.",
        lines: err.lines,
      };
    }
    if (err instanceof AppError) {
      return { status: "error", message: err.message };
    }
    console.error("submitCheckoutAction failed:", err);
    return { status: "error", message: "אירעה שגיאה בשליחת ההזמנה. נסו שוב." };
  }
}
