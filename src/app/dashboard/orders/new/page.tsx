// "Add order" screen. Loads THIS owner's products (tenant-scoped) and hands them
// to the form. Creating the order goes through the same createOrder service the
// storefront will use later.
import Link from "next/link";
import { requireTenantContext } from "@/lib/dal";
import { listProducts } from "@/modules/catalog/service";
import { AddOrderForm } from "./add-order-form";

export default async function NewOrderPage() {
  // Role/tenant gate for this whole /dashboard/* tree lives in layout.tsx now.
  const { user, ctx } = await requireTenantContext();
  const businessId = user.businessId!;

  const products = await listProducts(ctx, businessId);
  const options = products.map((p) => ({
    id: p.id,
    name: p.name,
    priceCents: p.priceCents,
    categoryName: p.category?.name ?? null,
  }));

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Add order</h1>

      {products.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-black/15 p-8 text-center text-zinc-500 dark:border-white/15">
          You need at least one product before you can add an order.{" "}
          <Link href="/dashboard/products" className="underline">
            Add products
          </Link>
          .
        </p>
      ) : (
        <AddOrderForm products={options} />
      )}
    </main>
  );
}
