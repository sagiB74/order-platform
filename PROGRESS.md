# Progress log

_Update this after each step so any future session knows exactly where we are._

## Roadmap (phases)
0. Foundations ✅
1. Tenant + auth spine (super-admin creates business, owner logs in) ✅ COMPLETE
2. Catalog (products + categories) ✅ COMPLETE
3. Orders + schedule (owner home) ✅ COMPLETE
4. Storefront render at `/[slug]` (must be beautiful/shareable) — NEXT
5. Cart + checkout + order submission (customer orders → same schedule)
6. Order management extras (aggregator "what to bake", richer statuses)
7. Analytics events + basic reports
8. Payment (web/link redirect) + super-admin dashboard + audit log + RLS

## Current status — Phase 1
- Step 1 ✅ Auth foundation: `src/modules/auth/password.ts`, `src/lib/session.ts`, `src/lib/dal.ts`
- Step 2 ✅ Seeded super-admin (`prisma/seed.ts`). Admin login: `sagibenilush@gmail.com`.
- Step 3 ✅ Login screen + logout + protected `/admin` and `/dashboard` (role-routed).
- Step 4 ✅ Super-admin creates a business + owner (`src/modules/businesses/service.ts`,
  `src/app/admin/actions.ts`, create form, businesses table on `/admin`).
- Step 5 ✅ Owner login → scoped `/dashboard`; Vitest suite added with the tenant ISOLATION
  TEST (`src/modules/tenant/context.test.ts`) + service-authz test. `npm test` → 7 passing.

## Phase 2 — Catalog ✅ COMPLETE
- Migration `add_catalog`: `Category` + `Product` tables (both carry `businessId`).
- Catalog service `src/modules/catalog/service.ts`: tenant-scoped list/create/update/delete
  for products + categories; every fn guards `assertCanAccessBusiness`. Cross-tenant category
  references are rejected too (`assertCategoryBelongsToBusiness`).
- Data-level isolation test `src/modules/catalog/service.test.ts` (owner A can't list/create in
  owner B's business). `npm test` → 11 passing.
- Owner UI at `/dashboard/products`: add product (name, price in ₪, category, desc, image URL),
  add category, sold-out/in-stock toggle, delete. Grouped by category. Money helper
  `src/lib/money.ts` (integer agorot everywhere; format/parse only at the edges).
- Demo data: `prisma/seed-catalog.ts` (`npm run db:seed:catalog`) seeded 8 gluten-free products
  in 3 categories into the oldest business ("test business" /test). Flavors modeled as separate
  products (the agreed MVP approach). Idempotent; targets DEMO_BUSINESS_SLUG or oldest business.

## Phase 3 — Orders + schedule (owner home) — IN PROGRESS
Reframed from "scheduling config" to what the owner actually asked for: her HOME page is a
schedule of orders. Orders are entered MANUALLY for now (she gets them on WhatsApp/phone);
later the storefront creates the same rows.
- ✅ `Order` + `OrderItem` tables (businessId, pickupAt, status OPEN/DONE, price/name SNAPSHOTS).
  Migration `add_orders`.
- ✅ Orders service `src/modules/orders/service.ts`: createOrder (snapshots product name+price,
  scopes product lookup to the business), listOrdersInRange, getOrder, setOrderStatus. All guard
  `assertCanAccessBusiness`. Isolation test `src/modules/orders/service.test.ts`. 13 tests pass.
- ✅ Schedule on `/dashboard` (`src/app/dashboard/page.tsx`): default **next 5 days**, toggle to
  **Month** with prev/next nav (URL param `?view=month&month=YYYY-MM`). Orders bucketed by day.
  `src/app/dashboard/order-card.tsx` (client): click to expand → phone w/ WhatsApp link
  (`src/lib/phone.ts`), line items, notes, total; **Mark as done / Reopen** (done stays visible,
  greyed). Date helpers in `src/lib/schedule.ts`. Timezone = server-local for now (TODO: use
  Business.timezone when multi-region).
- ✅ Demo orders seed `prisma/seed-orders.ts` (`npm run db:seed:orders`) — 7 orders across the
  next days in "test business". Idempotent (skips if orders exist).
- ✅ Manual **Add order** form at `/dashboard/orders/new` (`add-order-form.tsx` + `orders/actions.ts`):
  customer name/phone, pickup date+time, notes, per-product quantity with live total → calls the
  SAME `createOrder` service the storefront will use. "+ Add order" button on the schedule top bar.
- ✅ Schedule day blocks enlarged (min-height panels) so the 5-day view fills the screen.
- Phase 3 COMPLETE. Build clean, 13 tests pass.

## Stats (early slice of Phase 7) ✅
- `getMonthlyStats(ctx, businessId, year, monthIndex)` in orders service: per-product qty +
  revenue and totals for a calendar month (by pickup date), tenant-guarded. Isolation test added
  (owner A can't read owner B's stats). 14 tests pass.
- `/dashboard/stats`: month picker (last 12 months), KPI cards (total income / orders / items
  sold), and a sold-items table. "Stats" link added next to "Products" on the dashboard.
- Storefront design PROTOTYPE (artifact, not the app) is being iterated with the user for Hila.

## Visual redesign (in progress) — plan: ~/.claude/plans/quirky-splashing-rabbit.md
Brand = cream/brown from Hila's assets (`public/hila-backround.png`, `public/hila-logo-text.jpeg`).
Whole app is now Hebrew RTL (`layout.tsx` dir=rtl lang=he, Assistant font). Tokens in `globals.css`
via Tailwind v4 `@theme` (bg-ground/surface, text-ink, bg-accent…); `dark:` made opt-in so the app
commits to light.
- ✅ Phase A: tokens, global background, Assistant font, RTL, reusable `src/components/ui/*`
  (Button, Modal) + client cart `src/components/cart/*` (CartProvider+localStorage, CartBar sticky).
- ✅ Phase B: real storefront at `src/app/[slug]/page.tsx` (+ hero, product-catalog, product-modal).
  `src/modules/storefront/service.ts` getStorefront(slug) → isolated business+branding+available
  products. Zara-style grid grouped by category, "מבצע בקרוב" fillers (pad to multiple of 6),
  tap tile → modal, add-to-cart → sticky banner. Branding (about text + logo) seeded into
  Business.branding (`npm run db:seed:branding`). Verified: /test 200, /unknown 404, 14 tests, build OK.
- DB catalog RESEEDED to Hila's real Hebrew menu via `prisma/seed-catalog-hila.ts`
  (`npx tsx prisma/seed-catalog-hila.ts`) — 9 products in 3 Hebrew categories. `/test` verified
  showing her real products, categories, fillers, about text (HTTP 200).
- Customer shop is at `http://localhost:3000/test` (PUBLIC, no login). Root `/` redirects to owner
  login by design — the customer site is only at `/[slug]`.
- Storefront polish pass (post-launch tweaks): product grid tightened to a strict 4-col max (2 on
  mobile, `sm:` jumps straight to 4 — no 3-col tier, so `ROW_LCM=4` padding tiles cleanly at both),
  visible `gap-4` gutters + `px-5` framing (dropped the old `gap-px bg-border` edge-to-edge trick so
  the global background shows through), `rounded-2xl` on tiles/fillers. Cart flow reworked: tapping
  a tile's image OR its grid "add to cart" button now ALWAYS opens the product modal with a qty
  stepper — nothing adds silently anymore; only the modal's "אשר" button saves (calls new
  `setLine()` in `cart-context.tsx`, an upsert-absolute-quantity sibling to the existing `setQty`).
  Hero logo cropped tighter to just the circle (no white margin) via a measured CSS
  `transform: scale(...) translate(...)` — exact box found by pixel-scanning the source JPEG with
  `sharp` (already a project dep) rather than eyeballing; math + a rendered preview cross-check are
  documented inline in `hero.tsx`.

## Phase C — Owner dashboard: SPLIT IN TWO, blue theme ✅ COMPLETE (C.1–C.4 all done)
The user's dashboard requirements turned out to bundle a full navigation overhaul + at least 3
distinct new features (order-approval workflow, product inventory limits w/ auto-revert, an
analytics tab needing data we don't collect). Per working style, this got broken into a phased
roadmap instead of one mega-build — plan file: `~/.claude/plans/the-current-layout-is-harmonic-cherny.md`
(now holds the Phase C roadmap + reality-check table, superseding the earlier storefront-grid plan
that lived at the same path).

**Decided**: dashboard gets its OWN blue token set (`.dashboard-scope` in `globals.css`, deliberate
split from the storefront's cream/brown — same token variable names, scoped override via CSS
cascade, so `Button`/`Modal` etc. render blue automatically with no forked components). `/login` and
`/admin` are OUT of scope (spec was entirely about the post-login owner panel). Pending-orders
approval + inventory limits + a real stats backend are real features requiring schema/service work,
not a restyle — deferred to their own sub-phases, to be sourced from seeded demo data rather than
building live storefront checkout (Phase 5) first. Site-visits KPI will be a placeholder until
Phase 7 (analytics) proper.

- ✅ **C.1 — Dashboard shell** DONE: `src/app/dashboard/layout.tsx` (new) is now the single
  auth/role gate for the whole `/dashboard/*` tree (was duplicated across 4 pages — removed from
  each, they just call `requireTenantContext()` again for their own data, which is free via React
  `cache()`). Renders the blue-scoped background (`.dashboard-scope` wrapper, `public/
  owner-background.png` **now provided and wired** — light blue-white finance-doodle canvas) +
  `dashboard-nav.tsx` (3 Hebrew tabs לו"ז/מוצרים/נתונים, real routes not a JS tab-switcher,
  active-state via `usePathname()`) + one consolidated logout (was 2 duplicated inline forms, now 1).
- ✅ **C.2 — Schedule/Orders view** DONE (full content rebuild, not just the shell — first screen to
  get real Hebrew/blue content, not shell-only). Schema: `OrderStatus` gained `PENDING` (migration
  `add_pending_order_status`); `Order.status` still defaults to `OPEN` (the owner's own manual
  "Add order" form doesn't need self-approval). Service (`orders/service.ts`): `listPendingOrders`
  (the approval queue) + `rejectOrder` (hard-deletes, unlike DONE which stays visible); reused
  `setOrderStatus(..., OPEN)` for approve — no new function needed. **Important fix**:
  `listOrdersInRange` now explicitly excludes `PENDING` (`status: { not: PENDING }`) — otherwise a
  pending order's `pickupAt` falling inside the week/year window would have leaked it onto the
  schedule before approval, defeating the whole gate. 2 new isolation tests. `prisma/
  seed-pending-orders.ts` (`npm run db:seed:pending`, idempotent) seeds 3 demo PENDING orders — the
  approval queue is sourced from demo data standing in for a future real storefront-checkout intake
  (Phase 5), per the user's explicit call.
  UI (`src/app/dashboard/{page,schedule-client,pending-sidebar,order-detail-modal,
  all-orders-modal,schedule-types}.tsx`, replaces the retired `order-card.tsx`): left sidebar (RTL:
  visually left via DOM/grid order, not a literal `float`) = pending queue, click → modal with
  אשר/סרב/X; main area = bottom-nav-switched היום (compact cards, name/phone/time/status-as-its-own
  clickable-toggle pill, click elsewhere on the card → detail modal) / שבוע קרוב (7-col grid, small
  clickable order chips — both views share ONE server fetch of the week's orders, pure client state
  switch, no extra round-trip) / כל ההזמנות (dismissable modal, 12-month mini-calendar of the
  current year, click a day with orders → inline list within the same modal, never navigates).
  `weekWindow()` added to `src/lib/schedule.ts`. Verified thoroughly: typecheck/build/16 tests
  clean; hit the real page as the owner (minted session token) and confirmed real content renders
  (today's actual order, all 3 pending demo customers in the sidebar, 3-button nav); **approve and
  reject verified against real DB rows** via a disposable throwaway-orders test (not the demo data)
  run through the actual `setOrderStatus`/`rejectOrder` service functions, then cleaned up — confirms
  PENDING→OPEN and delete-with-cascade both genuinely work, not just typecheck. Final demo-data
  state confirmed: 6 OPEN + 1 DONE (original, untouched) + 3 PENDING (new, intact for you to click
  through) for the `test` business.
- ✅ **C.3 — Products view (מוצרים)** DONE (design/wiring pass; the inventory *backend* — schema
  state machine + `createOrder` enforcement + lazy revert-on-read in `listProducts` + the 6 catalog
  service functions/actions + the Hebrew `inventory-control.tsx` component — was already built in an
  earlier pass, but the page itself was never migrated and was in fact **broken**: `products/page.tsx`
  still imported the removed `toggleAvailabilityAction`, so typecheck/build were failing). This step:
  - Rewrote `src/app/dashboard/products/page.tsx` → Hebrew/RTL, blue tokens, title **"המוצרים שלי"**,
    products in a **grid grouped by category** at the top (card = name, price, description, delete),
    each card now wiring in the existing `<InventoryControl>` (3 states: אין במלאי / מכירה חופשית /
    להגביל→modal with days + max qty). Add-product + add-category forms **moved to the very bottom**.
    Removed the broken `toggleAvailabilityAction` import — the fix that unbreaks the build.
  - Restyled `add-product-form.tsx` + `add-category-form.tsx` → Hebrew, blue tokens, shared `Button`.
  - `inventory-control.tsx`: segmented control made full-width (`flex`/`flex-1`) so the 3 states fit
    a card without overflow; added `cursor-pointer`/`whitespace-nowrap`. Inline SVG trash icon on the
    delete button (no emoji, per the design guidelines used for this pass — `ui-ux-pro-max` skill).
  - Translated the create-product/create-category **action** result messages to Hebrew.
  - Also fixed two PRE-EXISTING build breakers unrelated to the UI: `prisma/seed-catalog-hila.ts` and
    `prisma/seed-catalog.ts` still set the removed `Product.isAvailable` field — dropped (inventoryMode
    defaults to UNLIMITED = orderable). `seed-catalog-hila.ts` is the one that loads Hila's real menu,
    so this also unbreaks a reseed.
  - Verified: `npm run typecheck` clean, `npm run build` clean, `npm test` 16/16. Rendered the page
    **as the logged-in owner** (minted a session JWT, fetched `/dashboard/products`) → HTTP 200 with
    the Hebrew title, all 3 inventory states, both Hebrew add-forms, real products, blue `bg-accent`
    tokens present, and the old English "Mark sold out" toggle gone.
- ✅ **C.4 — Statistics view (נתונים)** DONE. Rebuilt `stats/page.tsx` per the View 3 spec, Hebrew/RTL
  + blue tokens, `max-w-6xl` to match the other tabs. Two pre-existing bugs in the old
  `getMonthlyStats` were fixed as part of the rebuild (both confirmed live, not just by code
  review — see verification below): it aggregated by product **name** instead of `productId`
  (a rename or shared name would silently merge history), and it did **not** exclude `PENDING`
  orders from revenue/KPIs (an unapproved order could inflate numbers before the owner approved
  it) — unlike `listOrdersInRange`'s existing `status: { not: PENDING }` exclusion, which the new
  code now mirrors via a single `SALE_STATUS` constant.
  - `src/lib/schedule.ts`: added `monthRange` (exact `[1st, next-1st)` bounds — `monthWindow()` is
    a padded 6-week UI grid and was NOT safe to reuse for aggregation), `addMonths`, `lastMonths`,
    `formatMonthShort`; `formatMonthLabel` locale fixed `undefined` → `"he-IL"` (was rendering
    English month names on a Hebrew page). New `schedule.test.ts` (8 pure boundary-case tests:
    year rollover, leap Feb, month-window ordering).
  - `src/modules/orders/service.ts`: deleted `getMonthlyStats`/`MonthlyStats`; added
    `getSalesTimeSeries` (12-month revenue/order/item series, zero-filled for gap months),
    `getMonthlyProductStats` (per-product qty/revenue/order-share for one month, grouped by
    `productId` with `nameSnapshot` as a display-only fallback for orphaned/deleted products), and
    `getStatsOverview` (composes both + derives avg order value and MoM growth %). All go through
    `Order.findMany` rather than an `OrderItem` groupBy, since revenue
    (`priceCentsSnapshot * quantity`) is an expression Prisma's `_sum` can't express either way,
    and the order-level shape also gives order counts / "did this order contain X" for free.
    3 new isolation tests replace the old one.
  - Window choice: chart + "yearly" avg order value both use a **trailing 12 months ending at the
    selected month** (not a Jan–Dec calendar year) — one window powers the whole page, and it's a
    more honest "yearly" figure for a seasonal bakery. The **month picker** itself is unaffected
    (still last-12-months-from-today navigation).
  - New page split (`src/app/dashboard/stats/`): `page.tsx` (server, fetches + pre-formats
    everything), `stats-types.ts`, `month-picker.tsx`, `best-sellers-banner.tsx` (top-3 by revenue;
    falls back to 1 product per category when the month has no sales yet, picked by a **deterministic
    hash** of month+category rather than `Math.random()` so it's stable within a month but not a
    permanently-fixed "favorite"), `kpi-grid.tsx` (2×2: כניסות לאתר placeholder/"בקרוב",
    הזמנה ממוצעת, כמות הזמנות, אחוז עלייה in success/danger token color), `revenue-chart.tsx`
    (`"use client"`, **Recharts** — new dependency, ~136 packages incl. `@reduxjs/toolkit`/d3,
    confirmed clean against React 19 and Turbopack's build; colors passed as `"var(--color-accent)"`
    strings straight onto Recharts' SVG props so the chart re-themes for free; `dir="ltr"` wrapper
    so the time axis reads oldest→newest even on an RTL page), `product-analytics-grid.tsx` +
    `product-stat-modal.tsx` (`"use client"`, reuses `components/ui/modal.tsx` — click a product →
    qty/revenue/% of month's orders). RTL note: in the `lg:grid-cols-[320px_1fr]` KPI/chart row,
    `KpiGrid` had to be the FIRST JSX child to land on the right (confirmed from how
    `schedule-client.tsx` orders its own sidebar/main split).
  - Demo data: `prisma/seed-orders-history.ts` (`npm run db:seed:history`) backfills the 11 months
    before the current one with ~8–16 deterministic `DONE` orders each (125 created for "test
    business"), so the chart/KPIs have real spread instead of one live spike.
  - Verified: typecheck/build/tests clean (26 passing, was 16), rendered `/dashboard/stats` as the
    logged-in owner (minted session JWT) → HTTP 200 with all 4 Hebrew KPI labels, Hebrew month
    pills, zero leftover English/dark-mode markup, real catalog product names in the analytics
    grid; **re-fetched with a past `?month=` and got different KPI numbers**, proving the picker
    drives the data; **PENDING-exclusion bug fix confirmed against raw DB counts** (10 total orders
    this month vs 8 non-PENDING — the page's כמות הזמנות correctly showed 8). Chart's actual
    pixel-level rendering was **not** browser-verified — no headless browser tool (`chromium-cli`,
    Playwright) is available in this environment and installing one (a browser binary download)
    was left for you to decide on rather than done unasked; SSR shell (`data-chart="revenue"`),
    types, and the Turbopack production build all confirm the Recharts wiring is correct.

Checkout submission (cart→Order→schedule) is still Phase 5.

## Storefront pilot-demo tweaks (2026-08-11)
Hila saw the storefront pilot today; a few small follow-ups came out of that, all in
`src/app/[slug]/hero.tsx` unless noted:
- Hero card is now **full-bleed** (edge-to-edge, was floating with side margins + `max-w-6xl`) —
  dropped `px-3 md:px-5`/`mx-auto max-w-6xl`; nothing else in the tree constrains width, so it
  spans the viewport. Top gap + rounded top corners kept.
- Seal is now a **real photo** (`public/hila-seal.png`, the badge graphic Hila supplied — resized
  1254px→640px, 1.1MB→91KB) instead of CSS-drawn typography. It already prints its own ring + all
  copy, so the old bordered-ring/dotted-ring + live `sealTagline`/name/`sealNote` text rendering
  was removed. Added a screen-reader-only `<h1>{business.name}</h1>` so the page still has a real
  heading now that the visible seal is an image, not markup.
- Hero's bottom gradient stop changed `to-surface-2` → **`to-ground`** — it now fades to exactly
  the page's background color by the scalloped edge, so the seam is just the scallop shape + shadow
  ("one line"), not a visible color-block jump into the product section below.
- Added 2 more small decorative icons (`CakeSliceIcon`, `MeasuringCupIcon`) to the upper part of
  `HeroDecor`, near the left/right edges — reuses the same icon set already in the bottom cluster,
  just echoed up top too, to balance icon density between the top and bottom of the hero.
- Fixed a Next.js dev-overlay "1 Issue" warning (Postgres driver security warning about
  `sslmode=require` being aliased to `verify-full`): changed `.env`'s `DATABASE_URL` to explicit
  `sslmode=verify-full` — same behavior today (confirmed DB still connects), just future-proofed.
  Dev-only overlay; never visible to real site visitors.
- All verified: `typecheck`/`build`/`npm test` (26/26) clean after each change; hit the live
  `/test` page and confirmed the rendered HTML/classes match (no headless browser available in this
  environment to check pixel-level rendering, per the existing note above about the stats chart).

## Data model so far (`prisma/schema.prisma`)
- `Business` (slug, name, status, branding, timezone) and `User` (email, passwordHash, role,
  businessId?). Enums: `Role` (SUPER_ADMIN | BUSINESS_OWNER), `BusinessStatus`.
- `Category` (businessId, name, sortOrder) and `Product` (businessId, categoryId?, name,
  description?, priceCents, imageUrl?, isAvailable, sortOrder).
- `Order` (businessId, customerName, customerPhone, pickupAt, status, notes) and `OrderItem`
  (businessId, orderId, productId?, nameSnapshot, priceCentsSnapshot, quantity). Enum `OrderStatus`.
- Tables grow ONE phase at a time.

## How to run
```
cd /home/sagib_Linux/order-platform
npm run dev        # http://localhost:3000
```
Node 20 is required (system `node` is 18) — interactive terminals auto-load nvm; for
non-interactive/scripted shells prefix commands with:
`export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh" >/dev/null 2>&1;`

URLs once the dev server is up:
- Customer storefront (public, no login): `http://localhost:3000/test` — the demo business.
- Owner/super-admin login: `http://localhost:3000/login` (root `/` redirects here by design).
- Super-admin credentials: `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` in `.env` (currently
  `sagibenilush@gmail.com`). Logs into `/admin` — create/manage businesses + owners there.
- Owner credentials: whatever was set when the business/owner was created via `/admin`'s
  "create business" form — not tracked in this file (ask/check `/admin`'s businesses table if
  forgotten). Logs into `/dashboard` (לו"ז / מוצרים / נתונים tabs), scoped to that one business.

DB access straight from the terminal (no app involved):
- `npm run db:studio` — Prisma Studio, a local GUI browser for the tables (opens in your browser).
- `psql "$(grep DATABASE_URL .env | cut -d'"' -f2)"` — raw `psql` shell straight to the Neon DB,
  if you have `psql` installed locally (pulls the connection string out of `.env` so you don't have
  to paste the password).
