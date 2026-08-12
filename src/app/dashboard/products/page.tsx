// Owner's Products screen ("המוצרים שלי" — View 2 of the dashboard). Server
// component: it resolves the tenant context (the /dashboard/* auth+role gate
// lives in layout.tsx) and loads ONLY this business's products and categories
// through the tenant-guarded catalog service. Every query is scoped by the
// owner's own businessId — there is no way for this page to render another
// business's catalog.
//
// Layout per spec: products at the TOP in a grid grouped by category, each card
// carrying the 3-state inventory control (אין במלאי / מכירה חופשית / להגביל);
// the "add product" + "add category" forms moved to the very BOTTOM.
import { requireTenantContext } from "@/lib/dal";
import { listProducts, listCategories } from "@/modules/catalog/service";
import { formatCents } from "@/lib/money";
import { AddProductForm } from "./add-product-form";
import { AddCategoryForm } from "./add-category-form";
import { deleteProductAction } from "./actions";
import { InventoryControl, type InventoryState } from "./inventory-control";

type LoadedProduct = Awaited<ReturnType<typeof listProducts>>[number];

// The limit modal shows the expiry as a short DD/MM; format it server-side so the
// InventoryControl client component just renders a ready string.
function formatExpiry(d: Date | null): string | null {
  if (!d) return null;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

export default async function ProductsPage() {
  const { user, ctx } = await requireTenantContext();
  const businessId = user.businessId!;

  const [products, categories] = await Promise.all([
    listProducts(ctx, businessId),
    listCategories(ctx, businessId),
  ]);

  // Ordered groups: each category in order, then anything uncategorized. Empty
  // groups are dropped so the owner doesn't see a heading with nothing under it.
  const groups = [
    ...categories.map((c) => ({
      key: c.id,
      name: c.name,
      items: products.filter((p) => p.categoryId === c.id),
    })),
    {
      key: "__uncategorized__",
      name: "ללא קטגוריה",
      items: products.filter((p) => p.categoryId === null),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header>
        <h1 className="text-2xl font-extrabold text-ink">המוצרים שלי</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {products.length} מוצרים בקטלוג
        </p>
      </header>

      {/* Product grid, grouped by category */}
      {products.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-border bg-surface/60 p-10 text-center text-sm text-ink-soft">
          עדיין אין מוצרים. הוסיפו את המוצר הראשון בטופס שבתחתית העמוד.
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-3 flex items-center gap-2.5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-ink-soft">
                  {group.name}
                </h2>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-ink-soft">
                  {group.items.length}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Add forms — moved to the very bottom, per spec */}
      <div className="mt-14 border-t border-border pt-8">
        <h2 className="text-lg font-extrabold text-ink">הוספה לקטלוג</h2>
        <p className="mt-1 text-sm text-ink-soft">הוספת מוצר חדש או קטגוריה חדשה.</p>
        <div className="mt-4 grid items-start gap-6 md:grid-cols-2">
          <AddProductForm categories={categories} />
          <AddCategoryForm />
        </div>
      </div>
    </main>
  );
}

function ProductCard({ product }: { product: LoadedProduct }) {
  const state: InventoryState = {
    mode: product.inventoryMode as InventoryState["mode"],
    limitMaxQuantity: product.limitMaxQuantity,
    limitSoldCount: product.limitSoldCount,
    limitExpiresAt: formatExpiry(product.limitExpiresAt),
  };

  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-bold text-ink">{product.name}</h3>
          <div className="mt-0.5 text-sm font-semibold tabular-nums text-accent">
            {formatCents(product.priceCents)}
          </div>
        </div>

        {/* Delete lives in its own tiny form; only the productId is sent and the
            service re-checks ownership before deleting. */}
        <form action={deleteProductAction}>
          <input type="hidden" name="productId" value={product.id} />
          <button
            type="submit"
            aria-label={`מחיקת ${product.name}`}
            className="shrink-0 cursor-pointer rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          >
            <TrashIcon />
          </button>
        </form>
      </div>

      {product.description && (
        <p className="line-clamp-2 text-xs text-ink-soft">{product.description}</p>
      )}

      <div className="mt-auto pt-1">
        <InventoryControl productId={product.id} state={state} />
      </div>
    </div>
  );
}

// Inline SVG (no emoji, per the design guidelines) — a simple trash glyph.
function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
