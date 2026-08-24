"use server";
// Server Actions for the owner's Products screen.
//
// Every action re-establishes WHO is calling on the server via
// requireTenantContext() and derives the businessId from that context — it
// NEVER accepts a businessId from the form. The browser can only send a
// productId; the service then loads the row and checks ownership itself. So even
// a hand-crafted request can't act on another business's catalog.
import { revalidatePath } from "next/cache";
import { requireTenantContext } from "@/lib/dal";
import { currentBusinessId } from "@/modules/tenant/context";
import {
  createProduct,
  CreateProductInput,
  createCategory,
  CreateCategoryInput,
  setInventoryUnlimited,
  setInventoryOutOfStock,
  setInventoryLimited,
  deleteProduct,
} from "@/modules/catalog/service";
import { AppError, ForbiddenError } from "@/lib/errors";
import { parseShekelsToCents } from "@/lib/money";
import { requireId, requireInt } from "@/lib/form";

const PRODUCTS_PATH = "/dashboard/products";

export type FormState =
  | { ok: true; message: string }
  | { ok: false; error: string }
  | undefined;

/**
 * Resolve the calling owner's businessId, or throw. A platform super-admin has
 * no single business, so they can't use these owner-scoped actions.
 */
async function requireOwnBusinessId(): Promise<string> {
  const { ctx } = await requireTenantContext();
  const businessId = currentBusinessId(ctx);
  if (!businessId) {
    throw new ForbiddenError("This action is only available to a business owner.");
  }
  return businessId;
}

export async function createProductAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const businessId = await requireOwnBusinessId();
    const { ctx } = await requireTenantContext();

    // Price is typed by a human in shekels; convert to integer agorot.
    const priceCents = parseShekelsToCents((formData.get("price") ?? "").toString());
    if (priceCents === null) {
      return { ok: false, error: "יש להזין מחיר תקין (למשל 45 או 45.50)." };
    }

    // Empty optional fields come through as "" — normalize those to undefined.
    const categoryId = (formData.get("categoryId") ?? "").toString().trim() || undefined;
    const description = (formData.get("description") ?? "").toString().trim() || undefined;
    const imageUrl = (formData.get("imageUrl") ?? "").toString().trim() || undefined;

    const parsed = CreateProductInput.safeParse({
      name: (formData.get("name") ?? "").toString().trim(),
      priceCents,
      description,
      imageUrl,
      categoryId,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "קלט לא תקין." };
    }

    const product = await createProduct(ctx, businessId, parsed.data);
    revalidatePath(PRODUCTS_PATH);
    return { ok: true, message: `המוצר "${product.name}" נוסף.` };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message };
    console.error("createProduct failed:", err);
    return { ok: false, error: "משהו השתבש בהוספת המוצר." };
  }
}

export async function createCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const businessId = await requireOwnBusinessId();
    const { ctx } = await requireTenantContext();

    const parsed = CreateCategoryInput.safeParse({
      name: (formData.get("name") ?? "").toString().trim(),
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "קלט לא תקין." };
    }

    const category = await createCategory(ctx, businessId, parsed.data);
    revalidatePath(PRODUCTS_PATH);
    return { ok: true, message: `הקטגוריה "${category.name}" נוספה.` };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message };
    console.error("createCategory failed:", err);
    return { ok: false, error: "משהו השתבש בהוספת הקטגוריה." };
  }
}

/**
 * The 3 inventory-mode actions. Each is a plain <form action> bound per
 * product card; only the productId (and, for the limited case, the two
 * number inputs) is sent — the service re-verifies ownership itself.
 */
export async function setInventoryUnlimitedAction(formData: FormData): Promise<void> {
  const { ctx } = await requireTenantContext();
  const productId = requireId(formData, "productId");
  await setInventoryUnlimited(ctx, productId);
  revalidatePath(PRODUCTS_PATH);
}

export async function setInventoryOutOfStockAction(formData: FormData): Promise<void> {
  const { ctx } = await requireTenantContext();
  const productId = requireId(formData, "productId");
  await setInventoryOutOfStock(ctx, productId);
  revalidatePath(PRODUCTS_PATH);
}

export async function setInventoryLimitedAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { ctx } = await requireTenantContext();
    const productId = requireId(formData, "productId");
    // Validated here rather than letting Number() produce NaN/Infinity: the
    // service does re-parse, but a ZodError there is not an AppError and would
    // surface as the generic "something went wrong" instead of a useful message.
    const days = requireInt(formData, "days", { min: 1, max: 365 });
    const maxQuantity = requireInt(formData, "maxQuantity", { min: 1, max: 100_000 });
    await setInventoryLimited(ctx, productId, { days, maxQuantity });
    revalidatePath(PRODUCTS_PATH);
    return { ok: true, message: "המגבלה הוגדרה." };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message };
    console.error("setInventoryLimited failed:", err);
    return { ok: false, error: "משהו השתבש בהגדרת המגבלה." };
  }
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const { ctx } = await requireTenantContext();
  const productId = requireId(formData, "productId");
  await deleteProduct(ctx, productId);
  revalidatePath(PRODUCTS_PATH);
}
