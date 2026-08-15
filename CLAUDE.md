@AGENTS.md

# Order Platform — project instructions for Claude

Multi-tenant SaaS for small businesses (bakeries, flower shops, home food makers) that
currently take orders manually via WhatsApp/Instagram/phone. Each business gets a public
storefront at `/[slug]`, a private owner dashboard, and there is one platform super-admin.
First real tenant: a gluten-free maker (~6 products) whose storefront must be beautiful and
Instagram-shareable.

The current phase-by-phase status and "where we left off" lives in **@PROGRESS.md** — read it first.

## Environment (important gotchas)
- **Node 20 via nvm.** System `node` is 18 (too old). Interactive terminals auto-load nvm.
  In non-interactive shells, prefix commands with:
  `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh" >/dev/null 2>&1;`
- **Next.js 16 + React 19** — new majors; read `node_modules/next/dist/docs/` before writing app
  code. `cookies()` is async; middleware is now `proxy.ts`.
- **Prisma 7** — no `url` in schema; runtime client uses the `@prisma/adapter-pg` driver adapter
  (see `src/lib/db.ts`); CLI reads `.env` via `prisma.config.ts`. Generated client:
  `@/generated/prisma/client`, enums at `@/generated/prisma/enums`.
- **Postgres = Neon** (managed); connection string in `.env` (gitignored).
- Scripts: `npm run dev`, `db:migrate`, `db:seed`, `db:studio`, `typecheck`.

## Architecture rules
- Modular monolith. Routes (`src/app`) are THIN: resolve tenant + authorize, validate, then call
  a service in `src/modules/*`. All DB queries live in module services.
- **Multi-tenancy:** shared DB, `businessId` on every business-owned row. Tenant resolved
  server-side ONLY (session for dashboard/admin, slug for storefront) — never trust a client
  `businessId`. Every service function takes a `TenantContext` and checks it
  (`assertCanAccessBusiness` in `src/modules/tenant/context.ts`).
- **Storefront design is per-business, not owner-customizable.** Each business gets a dedicated,
  dev-built storefront UI (not a shared template the owner styles via the dashboard). `src/app/
  [slug]/page.tsx` is a thin dispatcher: it fetches tenant-scoped data via `getStorefront(slug)`
  (the ONE data path — never duplicate DB queries per business), then renders whichever template
  `src/storefronts/registry.ts` maps that slug to. A business's own folder under `src/storefronts/
  <name>/` owns only presentation (hero, layout) and receives data as props; it never queries the
  DB itself. Cart/checkout (`src/components/cart/*`) and the generic product grid
  (`src/components/storefront/*`) are genuinely shared and must NOT be forked per business — only
  duplicate a piece into a business's own folder if it's actually bespoke to them (see `src/
  storefronts/hila/hero.tsx` vs `src/storefronts/default/hero.tsx`). New business with no custom
  design yet → don't add it to the registry, it falls back to `DefaultStorefront` automatically.
- Money in integer cents; snapshot prices onto order_items.

## Working style with this user
- CS student who wants to UNDERSTAND, not copy. Build ONE step at a time; explain each file's
  what/why/how-it-connects/security-risk/how-to-test. Never dump the whole platform at once.
- Verify changes (typecheck + build + exercise the flow) before saying done.
