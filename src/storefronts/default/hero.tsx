// Generic fallback hero — used by any business that hasn't gotten a
// dedicated custom-built storefront yet (see ../registry.ts). Deliberately
// plain: just the business name + optional tagline on a token-colored panel.
// No hardcoded imagery/video, since a business without their own design also
// has no assets of their own to put here — a real custom hero (like Hila's
// in ../hila/hero.tsx) is built by hand per business once one is ready.
import type { StorefrontBranding } from "@/modules/storefront/service";

export function Hero({
  business,
  branding,
}: {
  business: { name: string; slug: string };
  branding: StorefrontBranding;
}) {
  return (
    <section className="flex min-h-[40vh] w-full flex-col items-center justify-center bg-surface-2 px-5 text-center">
      <h1 className="text-3xl font-extrabold text-ink md:text-5xl">{business.name}</h1>
      {branding.heroTagline ? (
        <p className="mt-4 max-w-md text-base font-medium text-ink-soft md:text-lg">
          {branding.heroTagline}
        </p>
      ) : null}
    </section>
  );
}
