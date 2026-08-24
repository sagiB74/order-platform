// Hila's storefront template — composes her custom hero with the shared
// product catalog + cart. This is what src/storefronts/registry.ts points
// the slug "test" (her demo business) at.
//
// Every storefront template (this file's shape) receives the exact same
// `storefront` prop — whatever `getStorefront(slug)` returns — and nothing
// here queries the database itself. That keeps tenant isolation in the ONE
// audited place (src/modules/storefront/service.ts) no matter how many
// custom designs get added later.
import type { Storefront } from "@/modules/storefront/service";
import { CartBar } from "@/components/cart/cart-bar";
import { ProductCatalog } from "@/components/storefront/product-catalog";
import { Hero } from "./hero";

export function HilaStorefront({ storefront }: { storefront: Storefront }) {
  return (
    <main className="min-h-full">
      <Hero business={storefront.business} branding={storefront.branding} />
      <ProductCatalog groups={storefront.groups} />
      <CartBar />
    </main>
  );
}
