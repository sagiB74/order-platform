"use server";
// Order status actions for the schedule (mark done / reopen). Like every other
// action, they resolve the tenant context on the server and only send a
// productId/orderId from the browser — the service verifies ownership itself.
import { revalidatePath } from "next/cache";
import { requireTenantContext } from "@/lib/dal";
import { setOrderStatus, rejectOrder } from "@/modules/orders/service";
import { OrderStatus } from "@/generated/prisma/enums";
import { requireId } from "@/lib/form";

export async function markOrderStatusAction(formData: FormData): Promise<void> {
  const { ctx } = await requireTenantContext();
  const orderId = requireId(formData, "orderId");
  const done = (formData.get("done") ?? "").toString() === "true";
  await setOrderStatus(ctx, orderId, done ? OrderStatus.DONE : OrderStatus.OPEN);
  // The schedule can be viewed in different windows; revalidate the whole route.
  revalidatePath("/dashboard");
}

/** Approve a pending order: PENDING → OPEN, so it now shows up on the schedule. */
export async function approveOrderAction(formData: FormData): Promise<void> {
  const { ctx } = await requireTenantContext();
  const orderId = requireId(formData, "orderId");
  await setOrderStatus(ctx, orderId, OrderStatus.OPEN);
  revalidatePath("/dashboard");
}

/** Reject a pending order: deletes it outright — it never reaches the schedule. */
export async function rejectOrderAction(formData: FormData): Promise<void> {
  const { ctx } = await requireTenantContext();
  const orderId = requireId(formData, "orderId");
  await rejectOrder(ctx, orderId);
  revalidatePath("/dashboard");
}
