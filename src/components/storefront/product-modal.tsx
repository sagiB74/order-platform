"use client";
// Product detail modal — opens whenever a customer taps a product tile (image
// OR the grid's "add to cart" button); it is the ONLY way products get added
// to the cart now. Shows the image + description and a quantity stepper.
// Closing any way OTHER than "אשר" (X, backdrop click, Escape — all routed
// through the shared `Modal`'s single `onClose`) discards whatever the
// stepper was adjusted to and never touches the cart; only the Confirm button
// (`ModalBody`'s `confirm`) calls into the cart.
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/money";
import { useCart } from "@/components/cart/cart-context";
import type { StorefrontProduct } from "@/modules/storefront/service";

export type Selected = { product: StorefrontProduct; emoji: string };

export function ProductModal({
  selected,
  onClose,
}: {
  selected: Selected | null;
  onClose: () => void;
}) {
  return (
    <Modal open={selected !== null} onClose={onClose}>
      {selected && (
        // Keyed by product id: switching products always mounts a fresh
        // ModalBody, so its local quantity state is freshly seeded from the
        // real cart quantity instead of carrying over another product's
        // unsaved (discarded) edit.
        <ModalBody key={selected.product.id} selected={selected} onClose={onClose} />
      )}
    </Modal>
  );
}

function ModalBody({ selected, onClose }: { selected: Selected; onClose: () => void }) {
  const { lines, setLine } = useCart();
  const cartQty = lines.find((l) => l.id === selected.product.id)?.quantity ?? 0;
  const [qty, setQty] = useState(cartQty > 0 ? cartQty : 1);

  const confirm = () => {
    setLine(
      {
        id: selected.product.id,
        name: selected.product.name,
        priceCents: selected.product.priceCents,
        imageUrl: selected.product.imageUrl,
      },
      qty,
    );
    onClose();
  };

  return (
    <div>
      <div className="mb-4 overflow-hidden rounded-2xl">
        {selected.product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selected.product.imageUrl}
            alt={selected.product.name}
            className="aspect-square w-full object-cover"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-surface-2 text-7xl">
            {selected.emoji}
          </div>
        )}
      </div>

      <h3 className="text-xl font-extrabold text-ink">{selected.product.name}</h3>
      <div className="mt-1 text-lg font-bold text-accent tabular-nums">
        {formatCents(selected.product.priceCents)}
      </div>
      {selected.product.description && (
        <p className="mt-3 leading-relaxed text-ink-soft">{selected.product.description}</p>
      )}
      <p className="mt-2 text-xs text-ink-soft">גלריית תמונות נוספת תתווסף בהמשך</p>

      {/* Quantity — local only until "אשר" is clicked */}
      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          aria-label="הפחתה"
          className="h-8 w-8 rounded-lg border border-border text-lg font-bold leading-none hover:border-accent hover:text-accent"
        >
          −
        </button>
        <span className="w-8 text-center text-lg font-bold tabular-nums">{qty}</span>
        <button
          type="button"
          onClick={() => setQty((q) => q + 1)}
          aria-label="הוספה"
          className="h-8 w-8 rounded-lg border border-border text-lg font-bold leading-none hover:border-accent hover:text-accent"
        >
          +
        </button>
      </div>

      <Button className="mt-5 w-full" size="lg" onClick={confirm}>
        אשר
      </Button>
    </div>
  );
}
