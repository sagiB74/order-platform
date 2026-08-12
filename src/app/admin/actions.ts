"use server";
// Server Action for the admin "Create business" form.
//
// It re-establishes WHO is calling on the server (requireTenantContext) — it
// never trusts the browser's claim about being an admin. Then it validates and
// delegates to the businesses service, which enforces the platform-admin rule
// again. Two independent checks: the action and the service.
import { revalidatePath } from "next/cache";
import { requireTenantContext } from "@/lib/dal";
import { createBusiness, CreateBusinessInput } from "@/modules/businesses/service";
import { AppError } from "@/lib/errors";

export type CreateBusinessState =
  | { ok: true; message: string }
  | { ok: false; error: string }
  | undefined;

export async function createBusinessAction(
  _prevState: CreateBusinessState,
  formData: FormData,
): Promise<CreateBusinessState> {
  // Requires a logged-in user (redirects to /login otherwise).
  const { ctx } = await requireTenantContext();

  // Normalize + validate input. Slug and email are lowercased/trimmed.
  const parsed = CreateBusinessInput.safeParse({
    name: (formData.get("name") ?? "").toString().trim(),
    slug: (formData.get("slug") ?? "").toString().trim().toLowerCase(),
    ownerEmail: (formData.get("ownerEmail") ?? "").toString().trim().toLowerCase(),
    ownerPassword: (formData.get("ownerPassword") ?? "").toString(),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const business = await createBusiness(ctx, parsed.data);
    revalidatePath("/admin"); // re-render the businesses table with the new row
    return {
      ok: true,
      message: `Created "${business.name}". Storefront link: /${business.slug}`,
    };
  } catch (err) {
    // Expected, user-facing failures (validation, forbidden) carry a safe message.
    if (err instanceof AppError) return { ok: false, error: err.message };
    // Unexpected: log server-side, show a generic message to the client.
    console.error("createBusiness failed:", err);
    return { ok: false, error: "Something went wrong creating the business." };
  }
}
