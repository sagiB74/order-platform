// Storefront template registry — maps a business's slug to its dedicated,
// custom-built storefront design. This is the ONE place that decides which
// UI a business gets; src/app/[slug]/page.tsx just calls resolveStorefront()
// and renders whatever comes back.
//
// To onboard a new business with a custom design: build its template folder
// under src/storefronts/<name>/ (copy the shape of hila/ — an index.tsx that
// composes a hero + the shared product catalog/cart), then add one line
// below mapping their slug to it. Until that's done, a business's storefront
// automatically falls back to `DefaultStorefront` (src/storefronts/default/)
// instead of 404ing.
//
// Keyed directly by slug (not a DB column) — deliberate for now, since we
// (the devs) are the only ones assigning designs and the roster is small.
// If slugs ever need to change independently of which design a business
// uses, or this needs to be visible/editable from /admin, promote this to a
// `Business.storefrontTemplate` column instead — see the discussion this
// registry came out of in PROGRESS.md.
import type { ComponentType } from "react";
import type { Storefront } from "@/modules/storefront/service";
import { HilaStorefront } from "./hila";
import { DefaultStorefront } from "./default";

export type StorefrontComponent = ComponentType<{ storefront: Storefront }>;

const registry: Record<string, StorefrontComponent> = {
  test: HilaStorefront, // Hila's demo business — slug is "test" (see PROGRESS.md)
};

export function resolveStorefront(slug: string): StorefrontComponent {
  return registry[slug] ?? DefaultStorefront;
}
