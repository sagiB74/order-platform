# Security notes — the storefront authorization fix

A write-up of one real authorization bug in this codebase: what it was, why it
existed, exactly how it was fixed, and what generalizes. Written as a learning
document, so it includes the reasoning and the things that are still open — not
just the patch.

**Status:** fixed in commit `73ae7bc`. Tests covering the rule: 41 passing, no
database required.

---

## 1. The insecure state

### The design

This is a multi-tenant SaaS. Three kinds of caller can reach business data:

| Caller | How they're identified | Should be able to |
|---|---|---|
| Platform super-admin | login session | anything, any business |
| Business owner | login session | anything, **their own** business |
| Anonymous shopper | the `/[slug]` in the URL | browse one storefront, place an order |

All three are represented by one object, the `TenantContext`, built **server-side
only** — from the session cookie for logged-in users, from the URL slug for
visitors. Never from a client-supplied `businessId`. That part was right, and
still is.

Every service function guarded itself with:

```ts
export function assertCanAccessBusiness(ctx: TenantContext, businessId: string): void {
  if (ctx.kind === "platform") return;
  if (ctx.businessId === businessId) return;
  throw new ForbiddenError();
}
```

### The bug

**That function never looks at `ctx.kind` for the non-platform cases.** It asks
one question — *"is this caller scoped to this business?"* — and both an owner
and an anonymous shopper answer it identically.

A visitor browsing `/hila` holds `{ kind: "storefront", businessId: "<hila's id>" }`.
Passing that to any of these would have returned success:

```ts
setOrderStatus(storefrontCtx, orderId, OrderStatus.OPEN)  // approve an order
rejectOrder(storefrontCtx, orderId)                       // hard-delete an order
deleteProduct(storefrontCtx, productId)                   // delete a product
listPendingOrders(storefrontCtx, businessId)              // read the intake queue
getStatsOverview(storefrontCtx, businessId, y, m)         // read revenue figures
```

The only thing marking storefront contexts as read-only was **a comment**:

```ts
// An anonymous public visitor viewing one storefront (read-only).
| { kind: "storefront"; businessId: string };
```

A comment is not a control. It does not execute.

### Why it was not exploitable — and why that is not reassuring

No attacker could trigger it, because **no public code path constructed a
storefront context and then called a mutation.** The only place a storefront
context existed was inside the read-only `getStorefront()`, and every server
action on the site required a login session first.

So this was a **latent** vulnerability: the authorization layer was already wrong,
and the only thing standing between it and a real exploit was the absence of a
feature. The next planned feature — customer checkout — is precisely a public
code path that constructs a storefront context and calls a write. Building it
first would have turned a dormant flaw into a live one, quietly, in a commit
that looked like a feature.

**That is the most useful lesson here.** The bug was introduced long before it
became dangerous, and it would never have shown up in testing, because nothing
was broken yet.

### Classification

- **OWASP Top 10:** A01:2021 — Broken Access Control (specifically *missing
  function-level access control*: the check that ran verified scope but not
  privilege).
- **Root cause:** conflating two different questions — *"which tenant is this?"*
  and *"what is this caller allowed to do?"* — into a single check. The context
  object carried a privilege level (`kind`) that the guard silently ignored.

---

## 2. The fix

Two independent layers, on the principle that a control you can only see at
runtime is one you'll find out about too late.

### Layer 1 — make it a compile error (`src/modules/tenant/context.ts`, `src/lib/dal.ts`)

Name the union members and add a narrower type that **excludes the anonymous
case by construction**:

```ts
export type PlatformContext   = { kind: "platform" };
export type BusinessContext   = { kind: "business";   businessId: string };
export type StorefrontContext = { kind: "storefront"; businessId: string };

export type TenantContext = PlatformContext | BusinessContext | StorefrontContext;

/** Contexts that come from an AUTHENTICATED SESSION. No storefront member. */
export type ManageContext = PlatformContext | BusinessContext;
```

Then narrow the one function that turns a login into a context:

```ts
// src/lib/dal.ts
export function toTenantContext(user: AuthUser): ManageContext { ... }
export async function requireTenantContext(): Promise<{ user: AuthUser; ctx: ManageContext }>
```

This is the load-bearing move. `toTenantContext` is the **only** way a session
becomes a context, and it now returns `ManageContext`. `StorefrontContext` is not
assignable to `ManageContext`. So any service declaring `ctx: ManageContext` is
*uncallable* with a visitor's context:

```ts
setOrderStatus({ kind: "storefront", businessId: "x" }, "o1", OrderStatus.OPEN);
//              ^ Argument of type StorefrontContext is not assignable to ManageContext
```

The violation is now caught by `tsc`, in the editor, before the code runs — and
it fails the CI typecheck rather than shipping.

### The "badge" — where authority actually comes from

The `ManageContext` is only ever minted from a verified session, so it is worth
being precise about what that session is:

- **Signed, not encrypted-and-trusted-blindly.** A JWT signed HS256 with
  `SESSION_SECRET` via `jose` (`src/lib/session.ts`). Verification pins the
  algorithm (`algorithms: ["HS256"]`), which is what prevents `alg: none` and
  algorithm-confusion attacks.
- **`httpOnly: true`** — unreadable from JavaScript, so XSS cannot exfiltrate it.
- **`secure: true` in production** — never sent over plaintext HTTP.
- **`sameSite: "lax"`** — the baseline CSRF mitigation for the session cookie.
- **Re-read from the database on every secure check.** `getCurrentUser()` does not
  trust the role inside the token; it loads the user row fresh, so a changed role
  or a deleted account takes effect immediately rather than at token expiry.
- **Passwords** are bcrypt-hashed (`src/modules/auth/password.ts`), and the user
  DTO returned by the DAL deliberately omits `passwordHash`.

So the chain is: cookie → verified signature → fresh DB read → `ManageContext`.
There is no step in that chain a client controls.

### Layer 2 — enforce it at runtime anyway

Types are erased at runtime. `as any` exists. Someone can widen a signature in a
future refactor. So the same rule is enforced a second time, in code:

```ts
/** Kind-only check, for functions that must load a row before they know its owner. */
export function assertIsManager(ctx: TenantContext): asserts ctx is ManageContext {
  if (ctx.kind === "storefront") {
    throw new ForbiddenError("Storefront visitors cannot manage this business.");
  }
}

/** The owner-only guard: right privilege AND right tenant. */
export function assertCanManageBusiness(
  ctx: TenantContext,
  businessId: string,
): asserts ctx is ManageContext {
  assertIsManager(ctx);              // privilege
  assertCanAccessBusiness(ctx, businessId);  // tenant scope
}
```

Two questions, asked separately, in that order.

### Which guard each function got

| Functions | Guard | Reason |
|---|---|---|
| `listProducts`, `listCategories` | `assertCanAccessBusiness` | the storefront legitimately reads the catalog |
| `createOrder` | `assertCanAccessBusiness` | **the single write a customer is allowed to reach** |
| all other order functions, all catalog mutations | `assertCanManageBusiness` | owner-only |

Note that the allowed public surface is exactly **two reads and one write**, and
each is a deliberate, individually justified exception rather than a default.

### Guard ordering: fail closed before the database

Functions that receive only a row id (`setOrderStatus`, `rejectOrder`, `getOrder`,
`deleteProduct`, `loadOwnedProduct`) can't know which business owns the row until
they load it. They now call `assertIsManager(ctx)` **first**:

```ts
export async function setOrderStatus(ctx: ManageContext, orderId: string, status: OrderStatus) {
  assertIsManager(ctx);                                  // privilege — before any I/O
  const existing = await db.order.findUnique({ ... });    // now learn the owner
  if (!existing) throw new NotFoundError("Order not found.");
  assertCanManageBusiness(ctx, existing.businessId);      // scope
  ...
}
```

Three benefits: an unauthorized caller costs zero database round-trips (so this
is not a cheap amplification vector), the rejection can't leak whether a given
order id exists, and the unit tests for these functions need no database — the
guard throws before any I/O.

### Tests that prove it

The rule, stated in two lines — same business, two different answers:

```ts
expect(() => assertCanManageBusiness(visitorB, "biz-B")).toThrow(ForbiddenError);
expect(() => assertCanAccessBusiness(visitorB, "biz-B")).not.toThrow();
```

And a set of tests that deliberately defeat the type layer, to confirm the
runtime layer stands alone:

```ts
// The cast is the point: TypeScript would reject these calls, so the only way to
// test the RUNTIME guard is to bypass the compile-time one.
const storefrontA = { kind: "storefront", businessId: "biz-A" } as unknown as ManageContext;

await expect(setOrderStatus(storefrontA, "order-1", OrderStatus.OPEN)).rejects.toBeInstanceOf(ForbiddenError);
await expect(rejectOrder(storefrontA, "order-1")).rejects.toBeInstanceOf(ForbiddenError);
await expect(deleteProduct(storefrontA, "prod-1")).rejects.toBeInstanceOf(ForbiddenError);
// ...and the same for getOrder, listPendingOrders, listOrdersInRange, getStatsOverview,
//    createProduct, createCategory, setInventoryOutOfStock
```

---

## 3. Takeaways for RBAC

**1. Scope and privilege are two different questions. Ask both.**
The whole bug was one check answering *"which tenant?"* while the caller assumed
it also answered *"what may they do?"*. In multi-tenant systems these collapse
easily, because tenant identity feels like the only axis that matters. It isn't:
a customer and an owner belong to the same tenant.

**2. A comment is not a control.**
`// (read-only)` sat directly above the type for months. Documentation describes
intent; only code enforces it. When you find yourself writing a comment that
states a security property, that is a signal the property should be expressed in
the type system or a guard instead.

**3. Push authorization into the type system where the language allows it.**
A runtime `ForbiddenError` tells you about a violation once it's deployed and
someone triggers it. A compile error tells you while you're typing. They cost the
same to write. Modelling "authenticated caller" as a distinct type that anonymous
callers cannot inhabit turns a whole class of mistake into a build failure.

**4. Keep both layers anyway — defence in depth.**
Types are erased at runtime, casts exist, and one `any` at a boundary undoes the
guarantee. Belt and braces: type for the developer, assert for the process.

**5. Default deny; enumerate the exceptions.**
After the fix, the anonymous surface is exactly two reads and one write. Each is
a conscious exception with a comment explaining why. It is far easier to audit "3
things are allowed" than "everything is allowed except the ones we remembered."

**6. Fail closed before doing work.**
Check privilege before I/O. Cheaper, avoids leaking existence through error
differences or timing, and it keeps tests fast and dependency-free.

**7. Derive privilege from server-side state, never from the request body.**
The tenant is resolved from the session cookie or the URL slug; a client-supplied
`businessId` is never trusted. The same principle is being applied to the
checkout being built now: the order's `status` will be derived from *who is
asking* (`ctx.kind === "storefront"` → `PENDING`) rather than accepted as input,
and prices will be re-read from the database rather than taken from the cart.
**If the client can't send it, the client can't forge it.**

**8. Audit authorization before you build the feature that reaches it.**
This flaw was harmless right up until the moment it wasn't. The trigger would
have been a feature commit, not a security commit. When you're about to expose a
new surface — a public endpoint, an anonymous role, a webhook — re-audit the
guards it will newly reach *first*, as its own change, so the security work is
reviewable on its own rather than buried inside a feature diff.

**9. Test the negative case, and test it at every layer you rely on.**
Most tests prove that permitted things work. Access-control tests must prove that
forbidden things fail. Where a control has two layers, deliberately disable one
to prove the other holds by itself — that's what the `as unknown as` casts are
for.

---

## 4. Known gaps (not fixed by this change)

Being honest about what this commit did *not* address:

- **No row-level security.** Isolation is enforced entirely in application code.
  Every table carries `businessId`, so Postgres RLS would be a genuine second
  layer beneath the service guards. Deliberately deferred.
- **No session revocation.** The session JWT is stateless with a 7-day expiry.
  There is no server-side invalidation, so a stolen cookie stays valid until it
  expires. No "log out all devices", no password-change invalidation.
- **No rate limiting or brute-force protection on login,** and the login path
  skips the bcrypt compare entirely when the email is unknown, which leaks
  account existence through response timing even though the error message is
  generic. Both are queued as the next hardening pass.
- **No audit log.** Nothing records who approved, rejected, or deleted what.
- **Not all server actions validate input.** Several pass raw ids straight
  through; the services re-check ownership, so this isn't an authorization hole,
  but it is unvalidated input reaching the data layer.
- **No security headers** (CSP, HSTS, `X-Frame-Options`) — `next.config.ts` is
  still empty.

These are tracked and will be addressed in their own commits, with the same
preference: enforce it where a mistake becomes impossible, not where it becomes
merely detectable.
