// Storefront hero — full-bleed rectangular section with a looping background
// video, a dark top-to-bottom gradient for text legibility, and the business
// name + tagline overlaid. Modeled on avantage.co.il's hero mechanism: a
// relatively-positioned section, an absolutely-positioned cover background, a
// gradient overlay, and heading content in normal flow on top (no z-index
// needed — paint order alone puts it above).
//
// Background is `public/hero.mp4` — Hila's pilot demo clip, used as a
// PLACEHOLDER for now (a stand-in until a final shot list/edit exists, not a
// judgment that this is the final cut). It replaced an earlier CSS Ken-Burns
// pan/zoom on the site's wallpaper texture, from before a video existed at
// all; that pan/zoom animation (--animate-hero-pan / @keyframes hero-pan)
// has been removed from globals.css since a real video is now doing the job.
//
// Server component: <video autoPlay muted loop playsInline> is a plain HTML
// attribute-driven autoplay, no React state/effects/hooks involved, so no
// "use client" is needed here either.
//
// branding.logoUrl / aboutText / ownerImageUrl / sealTagline / sealNote are
// still fetched by getStorefront but unused here — not a missed wire-up
// (ownerImageUrl in particular is never set by any seed script today, so it
// isn't a viable background candidate right now).
import type { StorefrontBranding } from "@/modules/storefront/service";

export function Hero({
  business,
  branding,
}: {
  business: { name: string; slug: string };
  branding: StorefrontBranding;
}) {
  return (
    <section className="relative min-h-[70vh] w-full overflow-hidden md:min-h-[80vh]">
      {/* Background layer — see file header comment */}
      <video
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        src="/hero.mp4"
      />

      {/* Legibility gradient — near-opaque top fading to transparent by ~82%
          down, same shape as Avantage's own overlay, using this project's
          ink token instead of their literal rgba values. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgb(74 53 39 / 0.92) 0%, rgb(74 53 39 / 0.55) 45%, rgb(74 53 39 / 0) 82%)",
        }}
      />

      {/* Content — normal flow, sits above via paint order. items-start/
          text-start (logical, not physical left/right) pin the block to the
          inline-start edge; since the whole app is permanently dir="rtl"
          (never mirrors to LTR), that edge is the right side. justify-center
          is unchanged, so vertical position stays exactly where it was. */}
      <div className="relative flex min-h-[70vh] flex-col items-start justify-center px-5 text-start md:min-h-[80vh] md:px-12">
        {/* business.name no longer renders visibly (the slogan below is the
            visual headline instead) — kept as a screen-reader-only <h1> so
            the page still has a real heading naming the actual business,
            same reasoning the old seal-badge hero used pre-rebuild. */}
        <h1 className="sr-only">{business.name}</h1>
        {/* Slogan text extracted from Hila's gluten_slogen.png (a designed
            graphic, not code) and typed out here as real text — only its
            wording is used, not the image itself, so it stays selectable and
            readable by screen readers instead of being a picture-of-text.
            Not aria-hidden: this is real content, not decoration. */}
        <p className="text-4xl font-extrabold text-surface drop-shadow-sm md:text-6xl">בית ללא גלוטן</p>
        {branding.heroTagline ? (
          <p className="mt-4 max-w-md text-base font-medium text-surface/90 md:mt-6 md:text-lg">
            {branding.heroTagline}
          </p>
        ) : null}
      </div>
    </section>
  );
}
