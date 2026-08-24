# Order Platform

A multi-tenant SaaS ordering platform for small food businesses — bakeries, home
food makers, flower shops — who currently take orders by hand over WhatsApp,
Instagram DMs and phone calls.

Each business gets a public storefront at `/[slug]`, a private owner dashboard,
and there is one platform super-admin above them all. A customer browses, fills a
cart and submits an order; it lands in the owner's approval queue; approving it
puts it on her schedule.

Built as a learning project by a CS student, with a working pilot business.

---

## The three surfaces

**1. Customer storefront — `/[slug]`, public, no login**
Product catalog grouped by category, cart persisted in `localStorage` per
business, and guest checkout (name, phone, pickup date/time, notes). Orders are
submitted as `PENDING` and wait for the owner's approval. Sold-out and
over-limit items are refused at submit time with a "fix my cart" prompt rather
than a dead end.

**2. Owner dashboard — `/dashboard`, login required, scoped to one business**
- **לו"ז (Schedule)** — today / next week / all orders, plus a sidebar approval
  queue for incoming customer orders (approve → schedule, reject → deleted).
- **מוצרים (Products)** — catalog CRUD with a three-state inventory control:
  always available, out of stock, or a time-boxed limited run (N units for N
  days, auto-flipping to out-of-stock when exhausted and auto-reverting when the
  window expires).
- **נתונים (Stats)** — 12-month revenue chart, KPI cards, per-product breakdown.

**3. Platform admin — `/admin`, super-admin only**
Create businesses and their owner accounts; list all businesses.

The app is Hebrew and right-to-left throughout.

---

## Architecture

**Modular monolith.** Routes in `src/app` are thin: resolve the tenant,
authorize, validate, then call a service in `src/modules/*`. All database queries
live in module services — never in a page or component.

```
src/
  app/                     routes (thin: resolve tenant -> authorize -> call a service)
    [slug]/                public storefront + checkout
    dashboard/             owner: schedule, products, stats
    admin/                 platform super-admin
  modules/                 business logic; ALL database access lives here
    tenant/context.ts      the isolation primitive (see below)
    auth/                  login, password hashing, rate limiting
    catalog/               products + categories
    orders/                orders, stats, and pure pricing/availability helpers
    storefront/            the public read path + the public checkout action
    businesses/            super-admin business creation
  storefronts/             per-business bespoke UI, chosen by registry.ts
  components/              shared UI: cart, product grid, buttons, modals
  lib/                     db client, session, DAL, errors, money, dates
```

### Multi-tenancy

Shared database, with a `businessId` column on every business-owned row. The
tenant is resolved **server-side only** — from the session cookie for the
dashboard and admin, from the URL slug for the storefront. A client-supplied
`businessId` is never trusted.

Every service function takes a `TenantContext` and guards itself before touching
data:

```ts
type TenantContext =
  | { kind: "platform" }                          // super-admin, any business
  | { kind: "business";   businessId: string }    // signed-in owner, one business
  | { kind: "storefront"; businessId: string };   // anonymous visitor, one business

/** Contexts that come from an authenticated SESSION. Excludes storefront. */
type ManageContext = PlatformContext | BusinessContext;
```

Two guards, asking two different questions:

- `assertCanAccessBusiness(ctx, businessId)` — *may you come near this business
  at all?* Used for reads the storefront legitimately performs, and for
  `createOrder`.
- `assertCanManageBusiness(ctx, businessId)` — *are you signed-in staff, AND is
  this your business?* Used for every mutation and every owner-facing read.

Because `toTenantContext()` returns the narrower `ManageContext`, a storefront
context is **not assignable** to any owner-only service — those calls fail to
compile, not just at runtime. The full story, including the bug that prompted
this design, is in [`security.md`](./security.md).

### Money and history

All money is integer agorot (cents); formatting happens only at the edges. Order
items snapshot the product's name and price at order time, so later renames,
repricing or deletion never rewrite a placed order.

### Storefront templating

Storefront design is **per-business and dev-built**, not owner-customizable.
`src/app/[slug]/page.tsx` is a thin dispatcher: it loads tenant-scoped data via
`getStorefront(slug)` — the one data path — then renders whichever template
`src/storefronts/registry.ts` maps the slug to, falling back to a generic
default. Cart, checkout and the product grid are genuinely shared and are never
forked per business.

---

## Security

Documented in detail in **[`security.md`](./security.md)**, including a
walk-through of a real broken-access-control bug found and fixed in this
codebase. Summary of what's in place:

- Sessions are HS256 JWTs (`jose`) in `httpOnly`, `sameSite=lax` cookies, `secure`
  in production, with the verification algorithm pinned.
- Passwords are bcrypt-hashed; the user DTO returned by the DAL omits the hash.
- The secure check re-reads the user from the database, so a changed role or a
  deleted account takes effect immediately rather than at token expiry.
- Login is rate-limited per email and per IP (Postgres-backed, since serverless
  instances share no memory), always runs a bcrypt compare so response timing
  doesn't reveal which emails are registered, and caps password length.
- Checkout re-reads prices from the database; the pricing function takes no price
  parameter, so a tampered `localStorage` cart has nowhere to inject one.
- Order status is derived from the tenant context, so no payload can skip the
  owner's approval queue.
- Environment variables are validated with zod at boot — the app refuses to start
  misconfigured.
- Security headers (HSTS, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`) are set for every response.

Known gaps are listed honestly at the end of `security.md`.

---

## Tech stack

Next.js 16 (App Router, Server Components + Server Actions, no API routes) ·
React 19 · TypeScript (`strict`) · PostgreSQL on Neon · Prisma 7 with the
`@prisma/adapter-pg` driver adapter · Tailwind CSS v4 · Recharts · zod · jose ·
bcryptjs · Vitest.

---

## Running locally

**Requires Node 20+** (Node 18 is too old).

```bash
git clone https://github.com/sagiB74/order-platform.git
cd order-platform
npm install

cp .env.example .env          # then fill in DATABASE_URL and SESSION_SECRET
npm run db:migrate            # create the schema
npm run db:seed               # create the super-admin from SEED_ADMIN_* vars

npm run dev                   # http://localhost:3000
```

Optional demo data (seeds are idempotent):

```bash
npm run db:seed:catalog       # products + categories
npm run db:seed:branding      # storefront copy and logo
npm run db:seed:orders        # a few upcoming orders
npm run db:seed:history       # ~11 months of past orders, for the stats charts
npm run db:seed:pending       # a few orders awaiting approval
```

Then:
- Storefront (public): `http://localhost:3000/test`
- Login: `http://localhost:3000/login` — `/` redirects here by design
- Super-admin: the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from your `.env`
- Business owner: created via the "create business" form in `/admin`

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | `prisma generate` then a production build |
| `npm start` | serve the production build |
| `npm test` | Vitest suite (no database required) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | create + apply a migration (development) |
| `npm run db:deploy` | apply existing migrations (production) |
| `npm run db:studio` | Prisma Studio, a GUI over the tables |

## Tests

```bash
npm test
```

The suite runs without a database. That is deliberate: the authorization tests
assert that forbidden calls are rejected *before* any query runs, so the absence
of a database is itself part of what they prove. Coverage is focused on the
things that would be expensive to get wrong — tenant isolation, the
storefront-cannot-manage rule, price tampering, availability arithmetic, checkout
input validation, and date boundary cases.

---

## Deploying

Works on any Node host; these steps assume Vercel + Neon.

1. **Create a production database.** Use a separate Neon project or branch — do
   not point production at your development database.
2. **Set environment variables** on the host: `DATABASE_URL` (use Neon's
   **pooled** endpoint, the host containing `-pooler`, or serverless invocations
   will exhaust the connection limit), a **freshly generated** `SESSION_SECRET`,
   and `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. `NODE_ENV=production` is set
   by the platform, and is what makes the session cookie `secure`.
3. **Apply migrations** against the production database:
   ```bash
   DATABASE_URL="<prod url>" npm run db:deploy
   ```
4. **Seed the super-admin** once:
   ```bash
   DATABASE_URL="<prod url>" npm run db:seed
   ```
5. **Deploy.** The build script runs `prisma generate` before `next build`.
6. **Verify:** log in at `/login`, create a business in `/admin`, open its
   storefront at `/[slug]`, place an order, and approve it from the dashboard.

Because the app requires HTTPS for its session cookie in production, it will not
work correctly when served over plain HTTP.
