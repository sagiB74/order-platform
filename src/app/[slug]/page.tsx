// PUBLIC customer storefront at /[slug]. This page is a thin DISPATCHER, not
// a design: it resolves the slug to a business via getStorefront (isolated
// to that business — the one and only tenant-guarded data path for the
// storefront), then hands that data to whichever custom storefront template
// the business is registered for (src/storefronts/registry.ts). Every
// business's UI can look completely different; only the data-fetching here
// is shared. If the slug doesn't resolve to an active business, it 404s.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStorefront } from "@/modules/storefront/service";
import { resolveStorefront } from "@/storefronts/registry";

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

  const Template = resolveStorefront(slug);
  return <Template storefront={storefront} />;
}
