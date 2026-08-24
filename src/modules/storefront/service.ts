// Storefront module — the PUBLIC read side. Given a slug, it resolves the
// business, builds a storefront tenant context locked to that business, and
// returns everything the public page needs. Because it reuses the tenant-guarded
// catalog services with a `storefront` context, it can only ever read that one
// business's data — the same isolation guarantee as the dashboard, driven by the
// URL slug instead of a login session.
import "server-only";
import { db } from "@/lib/db";
import { listCategories, listProducts } from "@/modules/catalog/service";
import type { StorefrontContext } from "@/modules/tenant/context";

export type StorefrontBranding = {
  logoUrl?: string;
  aboutText?: string;
  ownerImageUrl?: string;
  /** Seal copy — small spaced line above the business name in the hero badge. */
  sealTagline?: string;
  /** Seal copy — small line below the business name in the hero badge. */
  sealNote?: string;
  /** Playful one-liner rendered under the hero badge. */
  heroTagline?: string;
};

export type StorefrontProduct = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
};

export type StorefrontGroup = {
  id: string;
  name: string;
  items: StorefrontProduct[];
};

export type Storefront = {
  business: { name: string; slug: string };
  branding: StorefrontBranding;
  groups: StorefrontGroup[];
};

function parseBranding(value: unknown): StorefrontBranding {
  if (!value || typeof value !== "object") return {};
  const o = value as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
  return {
    logoUrl: str(o.logoUrl),
    aboutText: str(o.aboutText),
    ownerImageUrl: str(o.ownerImageUrl),
    sealTagline: str(o.sealTagline),
    sealNote: str(o.sealNote),
    heroTagline: str(o.heroTagline),
  };
}

export type ResolvedStorefront = {
  ctx: StorefrontContext;
  businessId: string;
  name: string;
  slug: string;
  branding: StorefrontBranding;
};

/**
 * Resolve a public slug to a business and a storefront TenantContext, or null
 * if no ACTIVE business owns that slug.
 *
 * This is the ONLY place in the codebase that constructs a StorefrontContext.
 * Keeping it to one function matters: the context is the authority an anonymous
 * request carries, so it must always be derived from the URL slug on the server
 * and never from anything the client sends. Both the public read (getStorefront)
 * and the public write (checkout) go through here.
 *
 * A SUSPENDED business resolves to null, so suspending one closes its storefront
 * to reads AND to new orders in a single check.
 */
export async function resolveStorefront(slug: string): Promise<ResolvedStorefront | null> {
  const business = await db.business.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, status: true, branding: true },
  });
  if (!business || business.status !== "ACTIVE") return null;

  return {
    ctx: { kind: "storefront", businessId: business.id },
    businessId: business.id,
    name: business.name,
    slug: business.slug,
    branding: parseBranding(business.branding),
  };
}

/**
 * Load a business's public storefront by slug, or null if it doesn't exist or
 * isn't active. Shows only AVAILABLE products, grouped by category (in order),
 * dropping empty groups.
 */
export async function getStorefront(slug: string): Promise<Storefront | null> {
  const resolved = await resolveStorefront(slug);
  if (!resolved) return null;

  const { ctx, businessId } = resolved;
  const [categories, products] = await Promise.all([
    listCategories(ctx, businessId),
    listProducts(ctx, businessId),
  ]);

  const available = products.filter((p) => p.isAvailable);
  const toView = (p: (typeof available)[number]): StorefrontProduct => ({
    id: p.id,
    name: p.name,
    description: p.description,
    priceCents: p.priceCents,
    imageUrl: p.imageUrl,
  });

  const groups: StorefrontGroup[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    items: available.filter((p) => p.categoryId === c.id).map(toView),
  }));

  const uncategorized = available.filter((p) => p.categoryId === null).map(toView);
  if (uncategorized.length) {
    groups.push({ id: "__uncategorized__", name: "עוד מהמאפייה", items: uncategorized });
  }

  return {
    business: { name: resolved.name, slug: resolved.slug },
    branding: resolved.branding,
    groups: groups.filter((g) => g.items.length > 0),
  };
}
