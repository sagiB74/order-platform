# TODO — Owner Dashboard overhaul (Phase C)

Living checklist for the 3-tab owner dashboard redesign. Blue theme, Hebrew/RTL, `owner-background.png`.
Full detail + rationale lives in `PROGRESS.md` (Phase C section) and the plan file
`~/.claude/plans/the-current-layout-is-harmonic-cherny.md`. Storefront work is tracked separately.

## Done — Phase C is complete (C.1–C.4)
- [x] **C.1 — Dashboard shell**: shared `dashboard/layout.tsx` (single auth/role gate), blue
      `.dashboard-scope` tokens, `owner-background.png`, 3-tab nav (לו"ז / מוצרים / נתונים), one logout.
- [x] **C.2 — Schedule & Orders (לו"ז)**: pending-approval sidebar (אשר/סרב/X), today cards with
      clickable status toggle, שבוע קרוב 7-day grid, כל ההזמנות yearly-calendar modal. `PENDING`
      order status + `listPendingOrders`/`rejectOrder` + demo seed.
- [x] **C.3 — Product Management (מוצרים)**: Hebrew/RTL + blue restyle; title "המוצרים שלי"; product
      grid grouped by category; 3-state inventory control wired in (אין במלאי / מכירה חופשית / להגביל
      + limit modal, auto out-of-stock when max reached, auto-revert when window expires); add-product
      & add-category forms moved to the bottom. Fixed the broken `toggleAvailabilityAction` import +
      the two `isAvailable` seed-script build breakers. typecheck/build/16 tests clean; verified as
      the logged-in owner (HTTP 200, all Hebrew content present).
- [x] **C.4 — Statistics & Analytics (נתונים)**: full rebuild of `stats/page.tsx` per the View 3 spec —
      best-sellers banner (top-3 by revenue, deterministic per-category fallback when no sales),
      Recharts revenue-over-time line chart, 2×2 KPI grid (site-visits placeholder, avg order value,
      monthly orders, MoM growth %), clickable product-analytics grid + modal. New aggregations
      (`getSalesTimeSeries`/`getMonthlyProductStats`/`getStatsOverview`) in `orders/service.ts`,
      3 new isolation tests, `schedule.ts` gained `monthRange`/`addMonths`/`lastMonths` + 8 pure
      tests. Fixed two pre-existing bugs along the way: stats now group by `productId` (not name)
      and exclude `PENDING` orders. `npm install recharts` (new dep, confirmed clean vs React 19 +
      Turbopack). Demo history seed `db:seed:history` (125 orders across 11 months). Full detail in
      `PROGRESS.md`. typecheck/build/26 tests clean; verified as the logged-in owner (HTTP 200,
      picker changes real KPI numbers, PENDING-exclusion confirmed against raw DB counts). One gap:
      chart's pixel-level rendering wasn't browser-screenshotted — no headless browser tool available
      in this environment; worth a manual look in a real browser before calling it fully done.

## Explicitly out of scope for this overhaul
- `/login` and `/admin` (super-admin) screens — the spec was only the post-login owner panel.
- Real site-visit analytics + storefront checkout→Order submission (Phase 5 / Phase 7).

## Next
Phase C (owner dashboard overhaul) is done. Next up per `PROGRESS.md`'s roadmap is Phase 5
(cart → checkout → order submission from the storefront), unless you want a browser pass on the
new revenue chart first.
