// Storefront hero — a full-bleed (edge-to-edge) cream banner with a scalloped
// bottom edge, a decorative hand-drawn bakery-doodle layer, a centered seal
// badge and a playful tagline underneath. Server component (no interactivity).
//
// The seal is a real PHOTO now (`public/hila-seal.png`, supplied by Hila) —
// its printed circle already carries the business name + both copy lines and
// its own ring, so it's rendered plain (rounded-full + object-cover, no extra
// border/text on top). This replaced an earlier CSS-typography version (name
// split across two lines via a small helper, rendered inside a bordered ring)
// that was used because the *previous* logo asset (hila-logo-text.jpeg) had a
// printed ring that clashed with the badge's own decorative ring — this new
// asset doesn't have that problem, so the photo goes in directly.
//
// branding.logoUrl / aboutText / ownerImageUrl are still fetched by
// getStorefront but deliberately NOT rendered here (possible future use, e.g.
// an about section) — not a missed wire-up.
import type { StorefrontBranding } from "@/modules/storefront/service";
import {
  CakeSliceIcon,
  CupcakeIcon,
  DotGridIcon,
  HeartIcon,
  MeasuringCupIcon,
  PipingBagIcon,
  PlusMark,
  WhiskIcon,
} from "./hero-icons";

export function Hero({
  business,
  branding,
}: {
  business: { name: string; slug: string };
  branding: StorefrontBranding;
}) {
  return (
    <div className="pt-3 md:pt-5">
      <section className="relative overflow-hidden rounded-t-[2rem] rounded-b-[50%_40px] bg-gradient-to-b from-surface via-surface to-ground px-5 pt-12 pb-24 shadow-lg md:rounded-b-[50%_64px] md:pt-16 md:pb-32">
        <HeroDecor />

        {/* Removing the seal's live text (below) dropped the page's only <h1>.
            Keep one for a11y/SEO structure — visually redundant now that the
            badge image prints the name itself, so it's screen-reader-only. */}
        <h1 className="sr-only">{business.name}</h1>

        {/* Seal — real printed badge (supplied by Hila), not CSS-drawn type.
            It already carries its own ring + all three text lines, so no
            decorative border/text is layered on top here (same reasoning as
            the header note above re: hila-logo-text.jpeg). */}
        <div className="relative mx-auto h-56 w-56 overflow-hidden rounded-full shadow-sm md:h-64 md:w-64">
          <img src="/hila-seal.png" alt={business.name} className="h-full w-full object-cover" />
        </div>

        {/* Tagline under the seal */}
        {branding.heroTagline ? (
          <p className="relative mx-auto mt-6 max-w-md text-center text-[15px] font-medium text-ink-soft md:mt-8 md:text-base">
            {branding.heroTagline}
          </p>
        ) : null}
      </section>
    </div>
  );
}

// Purely decorative art. Positions use PHYSICAL left/right (not logical
// start/end) on purpose: this is a fixed illustration composition, not text
// flow, so it must not mirror with page direction.
function HeroDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-accent/25">
      <PipingBagIcon className="absolute left-[7%] top-[12%] h-14 w-14 -rotate-12 md:h-16 md:w-16" />
      <DotGridIcon className="absolute right-[8%] top-[9%] h-14 w-14 text-accent/20" />
      <WhiskIcon className="absolute right-[13%] top-[44%] hidden h-14 w-14 rotate-12 sm:block" />
      <CupcakeIcon className="absolute -right-3 top-[58%] h-12 w-12 -rotate-6" />

      {/* A couple more marks up top, near the edges so they stay clear of the
          seal on narrow screens — same icons already used in the bottom
          cluster below, just echoed up here too. */}
      <CakeSliceIcon className="absolute left-[3%] top-[32%] h-10 w-10 rotate-6" />
      <MeasuringCupIcon className="absolute right-[4%] top-[30%] h-10 w-10 -rotate-6" />

      <PlusMark className="absolute left-[22%] top-[30%] h-3 w-3 text-accent/30" />
      <PlusMark className="absolute right-[26%] top-[24%] h-2.5 w-2.5 text-accent/30" />
      <PlusMark className="absolute left-[14%] top-[62%] h-3 w-3 text-accent/25" />
      <PlusMark className="absolute right-[19%] top-[72%] h-2.5 w-2.5 text-accent/25" />

      <span className="absolute bottom-[24%] left-[8%] hidden -rotate-6 items-center gap-1 text-sm text-accent/40 sm:flex">
        Made with <HeartIcon className="h-3.5 w-3.5" />
      </span>

      {/* Bottom cluster — pushed past the edge so the scalloped bottom clips it */}
      <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 translate-y-[38%] items-end gap-7 md:gap-10">
        <CakeSliceIcon className="h-12 w-12 md:h-14 md:w-14" />
        <CupcakeIcon className="h-14 w-14 md:h-16 md:w-16" />
        <MeasuringCupIcon className="h-12 w-12 -rotate-6 md:h-14 md:w-14" />
      </div>
    </div>
  );
}
