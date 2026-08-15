"use client";
// The product catalog — a 4-column max grid (2 on mobile) with gently rounded
// tiles and visible gutters so the global background shows through, grouped by
// category. Each category's last row is padded with "מבצע בקרוב" filler cells so
// the block stays a clean rectangle. Tapping a tile's image OR its add-to-cart
// button always opens the quantity-selection modal — the modal is the only
// place a product actually gets added to the cart (see product-modal.tsx).
//
// Lives in src/components/storefront/ (not under src/storefronts/<business>/)
// because nothing about this grid is business-specific — it's shared across
// every business's custom storefront template. Only genuinely bespoke pieces
// (like a hero) live inside a business's own src/storefronts/<slug>/ folder.
// See src/storefronts/registry.ts for how templates are wired up.
import { useState } from "react";
import { formatCents } from "@/lib/money";
import { ProductModal, type Selected } from "./product-modal";
import type { StorefrontGroup, StorefrontProduct } from "@/modules/storefront/service";

// Pad each category to a multiple of 4 so both the 2-col (mobile) and 4-col
// (sm+) grids always end on a full row (LCM(2, 4) = 4).
const ROW_LCM = 4;

function pickEmoji(category: string): string {
  if (/עוגיו|קוקי|פירור/.test(category)) return "🍪";
  if (/לחם|חלה|לחמני|מחמצת/.test(category)) return "🥖";
  if (/עוג|בבק|קינמון|סינבו|מאפ/.test(category)) return "🍰";
  return "🧁";
}

export function ProductCatalog({ groups }: { groups: StorefrontGroup[] }) {
  const [selected, setSelected] = useState<Selected | null>(null);

  return (
    <section className="mx-auto max-w-6xl pb-40">
      {groups.map((group) => {
        const emoji = pickEmoji(group.name);
        const fillers = (ROW_LCM - (group.items.length % ROW_LCM)) % ROW_LCM;
        return (
          <div key={group.id} className="mb-10">
            <h2 className="px-5 pb-3 pt-6 text-center text-2xl font-extrabold text-ink">
              {group.name}
            </h2>
            <div className="grid grid-cols-2 gap-4 px-5 sm:grid-cols-4">
              {group.items.map((p) => (
                <ProductTile
                  key={p.id}
                  product={p}
                  emoji={emoji}
                  onOpen={() => setSelected({ product: p, emoji })}
                />
              ))}
              {Array.from({ length: fillers }).map((_, i) => (
                <FillerCell key={`filler-${i}`} />
              ))}
            </div>
          </div>
        );
      })}

      <ProductModal selected={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function ProductTile({
  product,
  emoji,
  onOpen,
}: {
  product: StorefrontProduct;
  emoji: string;
  onOpen: () => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-surface">
      {/* Portrait (4:5) image — tapping opens the detail modal */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={product.name}
        className="group relative block aspect-[4/5] w-full overflow-hidden"
      >
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-2 p-3 text-center">
            <span className="text-5xl">{emoji}</span>
            <span className="text-sm font-semibold text-ink">{product.name}</span>
          </div>
        )}
        <span className="absolute start-2 top-2 rounded-full bg-surface/90 px-2.5 py-1 text-sm font-bold text-ink shadow tabular-nums">
          {formatCents(product.priceCents)}
        </span>
      </button>

      {/* Add-to-cart directly below the image */}
      <div className="flex h-[70px] flex-col justify-center gap-1 px-2 pb-2">
        <div className="truncate text-center text-sm font-bold text-ink">{product.name}</div>
        <button
          type="button"
          onClick={onOpen}
          className="w-full rounded-lg bg-accent py-2 text-xs font-bold text-white transition-colors hover:bg-accent-strong"
        >
          הוספה לסל
        </button>
      </div>
    </div>
  );
}

function FillerCell() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-surface-2/50">
      <div className="flex aspect-[4/5] w-full items-center justify-center p-3 text-center">
        <span className="text-sm font-bold text-ink-soft sm:text-base">מבצע בקרוב</span>
      </div>
      <div className="h-[70px]" />
    </div>
  );
}
