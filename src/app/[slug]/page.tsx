// PUBLIC customer storefront at /[slug]. Server component: resolves the slug to a
// business via getStorefront (isolated to that business), renders the hero, then
// wraps the interactive catalog + cart in the client CartProvider. If the slug
// doesn't resolve to an active business, it 404s.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStorefront } from "@/modules/storefront/service";
import { CartProvider } from "@/components/cart/cart-context";
import { CartBar } from "@/components/cart/cart-bar";
import { Hero } from "./hero";
import { ProductCatalog } from "./product-catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const storefront = await getStorefront(slug);
  return { title: storefront ? storefront.business.name : "חנות" };
}

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const storefront = await getStorefront(slug);
  if (!storefront) notFound();

  return (
    <main className="min-h-full">
      <Hero business={storefront.business} branding={storefront.branding} />
      <CartProvider storageKey={`cart:${storefront.business.slug}`}>
        <ProductCatalog groups={storefront.groups} />
        <CartBar />
      </CartProvider>
    </main>
  );
}
