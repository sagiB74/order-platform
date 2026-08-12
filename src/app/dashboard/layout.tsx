// The owner-dashboard shell — the ONE place that gates the whole /dashboard/*
// tree (every page under here used to redo this same check independently;
// now they don't have to) and renders the persistent chrome: the blue
// dashboard background/tokens (see .dashboard-scope in globals.css), the 3
// Hebrew nav tabs, and a single shared logout. Page CONTENT (schedule grid,
// forms, tables) is untouched here — that's each screen's own restyle pass.
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireTenantContext } from "@/lib/dal";
import { Role } from "@/generated/prisma/enums";
import { logout } from "@/modules/auth/actions";
import { DashboardNav } from "./dashboard-nav";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = await requireTenantContext();
  if (user.role !== Role.BUSINESS_OWNER || !user.businessId) {
    redirect("/admin"); // super-admins manage from /admin, not here
  }

  return (
    <div
      className="dashboard-scope min-h-dvh bg-ground bg-cover bg-top bg-fixed bg-no-repeat text-ink"
      style={{ backgroundImage: "url('/owner-background.png')" }}
    >
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <DashboardNav />
        <form action={logout}>
          <button
            type="submit"
            className="rounded-xl border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-2"
          >
            התנתקות
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
