"use server";
// Server Action for the manual "Add order" form. This is the SAME order-creation
// path the future customer storefront will call — it just gathers the input from
// the owner's form instead of a checkout. As always, the businessId comes from
// the server-side tenant context, never from the form.
import { redirect } from "next/navigation";
import { requireTenantContext } from "@/lib/dal";
import { currentBusinessId } from "@/modules/tenant/context";
import { createOrder, CreateOrderInput } from "@/modules/orders/service";
import { AppError } from "@/lib/errors";

export type CreateOrderState = { ok: false; error: string } | undefined;

export async function createOrderAction(
  _prev: CreateOrderState,
  formData: FormData,
): Promise<CreateOrderState> {
  const { ctx } = await requireTenantContext();
  const businessId = currentBusinessId(ctx);
  if (!businessId) {
    return { ok: false, error: "Only a business owner can add orders." };
  }

  // Product rows are submitted as `qty_<productId>` inputs; keep the ones > 0.
  const items: { productId: string; quantity: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("qty_")) continue;
    const quantity = Number(value);
    if (Number.isFinite(quantity) && quantity > 0) {
      items.push({ productId: key.slice(4), quantity: Math.floor(quantity) });
    }
  }

  const parsed = CreateOrderInput.safeParse({
    customerName: (formData.get("customerName") ?? "").toString().trim(),
    customerPhone: (formData.get("customerPhone") ?? "").toString().trim(),
    pickupAt: (formData.get("pickupAt") ?? "").toString(),
    notes: (formData.get("notes") ?? "").toString().trim() || undefined,
    items,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createOrder(ctx, businessId, parsed.data);
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message };
    console.error("createOrder failed:", err);
    return { ok: false, error: "Something went wrong adding the order." };
  }

  // Success: go back to the schedule, where the new order now appears.
  // (redirect() throws internally, so it must live OUTSIDE the try/catch above.)
  redirect("/dashboard");
}
