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

  // The lint rule below guards against DEFINING a component inside a render,
  // which remounts its subtree every time. This is a lookup, not a definition:
  // resolveStorefront returns one of a fixed set of module-level components from
  // the registry. It's also a Server Component, rendered once per request, so
  // there is no client reconciliation to disturb. Picking the template here is
  // the entire purpose of the dispatcher (see src/storefronts/registry.ts).
  const Template = resolveStorefront(slug);
  // eslint-disable-next-line react-hooks/static-components
  return <Template storefront={storefront} />;
}
