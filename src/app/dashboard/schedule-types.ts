// Shared shapes for the schedule's client components — pre-formatted on the
// server (time strings, day labels) rather than passing raw Dates down, same
// convention the old order-card.tsx used.

export type OrderSummary = {
  id: string;
  time: string;
  dateKey: string;
  dateLabel: string;
  customerName: string;
  customerPhone: string;
  // Widened to include PENDING (rather than a separate type) since a pending
  // order is still fundamentally "an order" — PendingSidebar just never
  // renders a status badge for it. listOrdersInRange (today/week/year) never
  // actually returns PENDING ones; only listPendingOrders does.
  status: "PENDING" | "OPEN" | "DONE";
  notes: string | null;
  items: { id: string; name: string; quantity: number; priceCents: number }[];
  totalCents: number;
};

export type DayBucket = {
  dateKey: string;
  dateLabel: string;
  orders: OrderSummary[];
};

export type DayCell = {
  dateKey: string;
  dayNum: number;
  inMonth: boolean;
  orders: OrderSummary[];
};

export type MonthGrid = {
  year: number;
  monthIndex: number;
  label: string;
  weeks: DayCell[][];
};
