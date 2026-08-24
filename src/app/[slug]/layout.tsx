// Wraps every page under /[slug] — the storefront itself AND /[slug]/checkout —
// in one CartProvider.
//
// WHY a layout: the provider used to live inside each storefront template, which
// meant a sibling route like /[slug]/checkout rendered OUTSIDE it and useCart()
// would throw. Hoisting it here gives both routes the same cart instance, and it
// stays a single shared component rather than something each business forks.
//
// Deliberately does NO data fetching, so an unknown or suspended slug still 404s
// from page.tsx exactly as before.
import type { ReactNode } from "react";
import { CartProvider } from "@/components/cart/cart-context";

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CartProvider slug={slug}>{children}</CartProvider>;
}
