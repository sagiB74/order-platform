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

## Done — Storefront templating refactor (2026-08-15)
- [x] Decided design direction: businesses get a **dedicated, dev-built** storefront (not
      owner-customizable via the dashboard). `src/app/[slug]/page.tsx` is now a thin dispatcher —
      `getStorefront(slug)` → `resolveStorefront(slug)` (`src/storefronts/registry.ts`, keyed
      directly by slug) → render that business's template component.
- [x] `src/storefronts/hila/` — Hila's real design (video hero + `index.tsx` composer), moved
      as-is out of `src/app/[slug]/`.
- [x] `src/storefronts/default/` — plain fallback template for a business with no custom build yet.
- [x] `product-catalog.tsx`/`product-modal.tsx` moved to shared `src/components/storefront/`
      (generic, used by every template — not duplicated per business).
- [x] `main` merged with the video-hero commit (`storefront-hero-video-redesign` branch,
      fast-forwarded) before this refactor started. **Not yet pushed to `origin/main`.**
- [x] Verified: typecheck/build/tests (26/26) clean + live dev-server check (`/test` 200 w/
      `hero.mp4`, unknown slug still 404s). Full detail in `PROGRESS.md`.

## Next
1. **Push `main` to `origin/main`** (currently 1 commit ahead of remote, local-only) — ask before
   doing this, or do it whenever convenient.
2. **Owner dashboard features** — user has additional feature requests for the owner-side dashboard
   (מוצרים/לו"ז/נתונים tabs), to be captured here once described, BEFORE moving on to Phase 5.
3. Phase 5 (cart → checkout → order submission from the storefront) — per `PROGRESS.md`'s roadmap,
   comes after the dashboard features above. Note: once built, checkout logic should live in
   `src/modules/orders/service.ts` + be called from the shared `src/components/cart/*`, so it
   automatically works for every business's storefront template, not just Hila's.
4. Optional: a real browser pass on the stats revenue chart (`src/app/dashboard/stats/
   revenue-chart.tsx`) — pixel-level rendering still hasn't been screenshot-verified, no headless
   browser tool was available when it was built.
