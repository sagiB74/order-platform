// Server component — plain <Link>s driving the page's ?month=YYYY-MM query
// param, so navigation is a normal page nav (no client JS needed for this).
// Token-styled version of the old page's black/white pill picker.
import Link from "next/link";

export type MonthOption = { param: string; label: string };

export function MonthPicker({
  months,
  selectedParam,
}: {
  months: MonthOption[];
  selectedParam: string;
}) {
  return (
    <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
      {months.map((m) => {
        const active = m.param === selectedParam;
        return (
          <Link
            key={m.param}
            href={`/dashboard/stats?month=${m.param}`}
            className={
              active
                ? "shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-sm font-bold text-white"
                : "shrink-0 rounded-full border border-border px-3.5 py-1.5 text-sm font-semibold text-ink hover:bg-surface-2"
            }
          >
            {m.label}
          </Link>
        );
      })}
    </div>
  );
}
