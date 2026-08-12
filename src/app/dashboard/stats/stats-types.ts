// Shared view-model types for the stats tab's client islands — pre-formatted
// on the server (money as strings, not raw cents) before crossing the
// server/client boundary, same convention schedule-types.ts uses for the
// schedule view.

export type ProductAnalyticsItem = {
  id: string;
  name: string;
  description: string | null;
  priceLabel: string;
  quantitySold: number;
  revenueLabel: string;
  orderSharePct: number;
};

export type ProductGroup = {
  key: string;
  name: string;
  items: ProductAnalyticsItem[];
};
