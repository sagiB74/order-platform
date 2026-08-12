// Server component — the 2x2 KPI grid. Pure display, everything is already
// formatted by page.tsx.

function KpiCard({
  label,
  value,
  hint,
  valueClassName = "",
}: {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="text-sm text-ink-soft">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums text-ink ${valueClassName}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-soft">{hint}</div>}
    </div>
  );
}

export function KpiGrid({
  avgOrderValueLabel,
  orderCount,
  selectedMonthLabel,
  growthPct,
}: {
  avgOrderValueLabel: string;
  orderCount: number;
  selectedMonthLabel: string;
  growthPct: number | null;
}) {
  const growthLabel = growthPct === null ? "—" : `${growthPct >= 0 ? "+" : ""}${growthPct}%`;
  const growthClass = growthPct === null ? "" : growthPct >= 0 ? "text-success" : "text-danger";

  return (
    <div className="grid grid-cols-2 gap-4">
      <KpiCard label="כניסות לאתר" value="—" hint="בקרוב" />
      <KpiCard label="הזמנה ממוצעת" value={avgOrderValueLabel} hint={selectedMonthLabel} />
      <KpiCard label="כמות הזמנות" value={String(orderCount)} hint={selectedMonthLabel} />
      <KpiCard
        label="אחוז עלייה"
        value={growthLabel}
        hint="מול החודש הקודם"
        valueClassName={growthClass}
      />
    </div>
  );
}
