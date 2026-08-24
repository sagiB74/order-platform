// The customer's checkout screen.
//
// A real route rather than another sheet inside the cart bar: it gives the back
// button sane behaviour (return to the shop, cart intact), room for the
// "some items sold out" reconciliation UI, and it doesn't fight the mobile
// keyboard the way a fixed-position overlay does.
//
// Fetches no product data — the cart is client state. It loads the storefront
// only to confirm the business exists and is ACTIVE (so a suspended shop can't
// even render a checkout form) and to show its name.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStorefront } from "@/modules/storefront/service";
import { CheckoutForm } from "@/components/cart/checkout-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const storefront = await getStorefront(slug);
  return { title: storefront ? `סיום הזמנה · ${storefront.business.name}` : "סיום הזמנה" };
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const storefront = await getStorefront(slug);
  if (!storefront) notFound();

  return <CheckoutForm businessName={storefront.business.name} />;
}
