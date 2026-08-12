// Server component — top-3-by-revenue banner. When the selected month has no
// sales yet, falls back to showcasing 1 product per category so the banner
// is never empty for a brand-new business.
import { formatCents } from "@/lib/money";

type CatalogProduct = { id: string; name: string; priceCents: number; categoryId: string | null };
type Category = { id: string; name: string };
type ProductStat = { key: string; name: string; revenueCents: number };

type BannerItem = { key: string; name: string; subLabel: string };

/**
 * The fallback pick must be the SAME on every request within a month (else it
 * flickers on refresh) but change between months — so instead of Math.random()
 * we hash (month + category) into a stable index. Not cryptographic, just a
 * cheap deterministic "shuffle".
 */
function hashString(s: string): number {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function pickFallback(
  monthKey: string,
  products: CatalogProduct[],
  categories: Category[],
): BannerItem[] {
  if (products.length === 0) return [];

  const byCategory = new Map<string, CatalogProduct[]>();
  for (const p of products) {
    const key = p.categoryId ?? "__uncategorized__";
    const list = byCategory.get(key) ?? [];
    list.push(p);
    byCategory.set(key, list);
  }

  const groupKeys = categories.map((c) => c.id).filter((id) => byCategory.has(id));
  if (byCategory.has("__uncategorized__")) groupKeys.push("__uncategorized__");

  const picked: BannerItem[] = [];
  const usedIds = new Set<string>();

  for (const groupKey of groupKeys) {
    if (picked.length >= 3) break;
    const list = byCategory.get(groupKey)!;
    const product = list[hashString(`${monthKey}:${groupKey}`) % list.length];
    picked.push({ key: product.id, name: product.name, subLabel: formatCents(product.priceCents) });
    usedIds.add(product.id);
  }

  // Fewer than 3 categories existed — top up from whatever's left so the
  // banner still shows 3 squares.
  if (picked.length < 3) {
    for (const p of products) {
      if (picked.length >= 3) break;
      if (usedIds.has(p.id)) continue;
      picked.push({ key: p.id, name: p.name, subLabel: formatCents(p.priceCents) });
    }
  }

  return picked;
}

export function BestSellersBanner({
  monthKey,
  monthly,
  products,
  categories,
}: {
  monthKey: string;
  monthly: { products: ProductStat[] };
  products: CatalogProduct[];
  categories: Category[];
}) {
  const hasSales = monthly.products.length > 0;
  const items: BannerItem[] = hasSales
    ? monthly.products
        .slice(0, 3)
        .map((p) => ({ key: p.key, name: p.name, subLabel: formatCents(p.revenueCents) }))
    : pickFallback(monthKey, products, categories);

  if (items.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">
        {hasSales ? "המוצרים המובילים החודש" : "מוצרים מומלצים"}
      </h2>
      <div className="grid grid-cols-3 gap-4 sm:max-w-xl">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-2xl border border-border bg-surface p-4 text-center shadow-sm"
          >
            <div className="truncate text-sm font-bold text-ink">{item.name}</div>
            <div className="mt-1 text-xs font-semibold tabular-nums text-accent">{item.subLabel}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
