"use client";
// The 3 persistent Hebrew tabs (לו"ז / מוצרים / נתונים). Client component only
// because active-tab highlighting needs the current pathname; each tab is a
// real route (not a client-side view switch), so URLs and the back button
// keep working normally.
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: 'לו"ז' },
  { href: "/dashboard/products", label: "מוצרים" },
  { href: "/dashboard/stats", label: "נתונים" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              active
                ? "rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white"
                : "rounded-xl px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-2"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
