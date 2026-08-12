// Owner's Statistics screen ("נתונים" — View 3 of the dashboard). Server
// component: resolves the tenant context (the /dashboard/* auth+role gate
// lives in layout.tsx), fetches this business's stats + catalog through the
// tenant-guarded services, and pre-formats everything (money -> strings)
// before handing data down to the two interactive client islands (the
// Recharts revenue chart and the clickable product-analytics grid).
import { requireTenantContext } from "@/lib/dal";
import { getStatsOverview } from "@/modules/orders/service";
import { listProducts, listCategories } from "@/modules/catalog/service";
import { formatCents } from "@/lib/money";
import { parseMonthParam, monthParam, formatMonthLabel, formatMonthShort } from "@/lib/schedule";
import { MonthPicker, type MonthOption } from "./month-picker";
import { BestSellersBanner } from "./best-sellers-banner";
import { KpiGrid } from "./kpi-grid";
import { RevenueChart, type RevenuePoint } from "./revenue-chart";
import { ProductAnalyticsGrid } from "./product-analytics-grid";
import type { ProductGroup } from "./stats-types";

type LoadedProduct = Awaited<ReturnType<typeof listProducts>>[number];
type MonthlyProduct = Awaited<ReturnType<typeof getStatsOverview>>["monthly"]["products"][number];

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { user, ctx } = await requireTenantContext();
  const businessId = user.businessId!;

  const now = new Date();
  const { year, monthIndex } = parseMonthParam((await searchParams).month, now);

  const [overview, products, categories] = await Promise.all([
    getStatsOverview(ctx, businessId, year, monthIndex),
    listProducts(ctx, businessId),
    listCategories(ctx, businessId),
  ]);

  // Last 12 months from TODAY (navigation), independent of the trailing-12
  // window the chart/KPIs use (a lookback from whichever month is selected).
  const months: MonthOption[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      param: monthParam(d.getFullYear(), d.getMonth()),
      label: formatMonthLabel(d.getFullYear(), d.getMonth()),
    };
  });
  const selectedParam = monthParam(year, monthIndex);
  const selectedMonthLabel = formatMonthLabel(year, monthIndex);

  const revenuePoints: RevenuePoint[] = overview.series.map((p) => ({
    label: formatMonthShort(p.year, p.monthIndex),
    revenue: Math.round(p.revenueCents / 100), // chart works in shekels, not agorot
  }));

  const statByProductId = new Map<string, MonthlyProduct>(
    overview.monthly.products
      .filter((p): p is MonthlyProduct & { productId: string } => p.productId !== null)
      .map((p) => [p.productId, p]),
  );
  const toAnalyticsItem = (p: LoadedProduct) => {
    const stat = statByProductId.get(p.id);
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      priceLabel: formatCents(p.priceCents),
      quantitySold: stat?.quantity ?? 0,
      revenueLabel: formatCents(stat?.revenueCents ?? 0),
      orderSharePct: stat?.orderSharePct ?? 0,
    };
  };

  // Same grouped-by-category shape as the products page: each category in
  // order, then uncategorized, empty groups dropped. Orphaned sales lines
  // (deleted products) intentionally have no card here — they're still
  // counted in the KPIs/best-sellers above, just not browsable per-product.
  const groups: ProductGroup[] = [
    ...categories.map((c) => ({
      key: c.id,
      name: c.name,
      items: products.filter((p) => p.categoryId === c.id).map(toAnalyticsItem),
    })),
    {
      key: "__uncategorized__",
      name: "ללא קטגוריה",
      items: products.filter((p) => p.categoryId === null).map(toAnalyticsItem),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header>
        <h1 className="text-2xl font-extrabold text-ink">נתונים</h1>
        <p className="mt-1 text-sm text-ink-soft">נתונים עבור {selectedMonthLabel}</p>
      </header>

      <MonthPicker months={months} selectedParam={selectedParam} />

      <BestSellersBanner
        monthKey={selectedParam}
        monthly={overview.monthly}
        products={products}
        categories={categories}
      />

      {/* KpiGrid is the FIRST child so it renders on the RIGHT in this RTL
          layout (spec: chart on the left, KPIs on the right). */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <KpiGrid
          avgOrderValueLabel={formatCents(overview.avgOrderValueCents)}
          orderCount={overview.selected.orderCount}
          selectedMonthLabel={selectedMonthLabel}
          growthPct={overview.growthPct}
        />
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <RevenueChart points={revenuePoints} />
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-border bg-surface/60 p-10 text-center text-sm text-ink-soft">
          עדיין אין מוצרים. הוסיפו מוצרים בעמוד המוצרים.
        </p>
      ) : (
        <>
          <h2 className="mt-10 text-lg font-extrabold text-ink">ביצועי מוצרים</h2>
          <ProductAnalyticsGrid groups={groups} monthLabel={selectedMonthLabel} />
        </>
      )}
    </main>
  );
}
