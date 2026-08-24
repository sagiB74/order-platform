// Default storefront template — plain fallback for any business that hasn't
// gotten a dedicated custom-built design yet (see ../registry.ts). Same
// shared cart/catalog as every other template; only the hero differs.
import type { Storefront } from "@/modules/storefront/service";
import { CartBar } from "@/components/cart/cart-bar";
import { ProductCatalog } from "@/components/storefront/product-catalog";
import { Hero } from "./hero";

export function DefaultStorefront({ storefront }: { storefront: Storefront }) {
  return (
    <main className="min-h-full">
      <Hero business={storefront.business} branding={storefront.branding} />
      <ProductCatalog groups={storefront.groups} />
      <CartBar />
    </main>
  );
}
